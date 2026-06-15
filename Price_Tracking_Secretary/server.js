// 로컬 실행 때 MongoDB 연결이 불안정할 수 있어서 DNS 서버를 지정한다
if (!process.env.RENDER) {
    require("dns").setServers(["8.8.8.8", "1.1.1.1"]);
}

const express = require("express");
const mongoose = require("mongoose");

const app = express();
const port = process.env.PORT || 3000;

// Render에서는 환경변수로 MongoDB 주소를 넣어준다
const MONGO_URI = process.env.MONGO_URI;

// 테스트를 위해 1분마다 자동으로 가격을 갱신한다
const checkInterval = 60 * 1000;

app.use(express.json());
app.use(express.static(__dirname));


// 상품, 가격 이력, 알림, 로그 정보를 한 문서에 저장한다
const appDataSchema = new mongoose.Schema({
    products: { type: Array, default: [] },
    priceHistories: { type: Array, default: [] },
    notifications: { type: Array, default: [] },
    errorLogs: { type: Array, default: [] },
    systemLogs: { type: Array, default: [] },
    noticeSettings: { type: Object, default: {} }
});

const AppData = mongoose.model("AppData", appDataSchema);


// DB에서 저장된 데이터를 가져온다
async function loadData() {

    let data = await AppData.findOne();

    if (data === null) {

        data = await AppData.create({
            products: [],
            priceHistories: [],
            notifications: [],
            errorLogs: [],
            systemLogs: [],
            noticeSettings: {}
        });
    }

    return data;
}


// 변경된 데이터를 DB에 저장한다
async function saveData(data) {

    await AppData.updateOne(
        {},
        {
            products: data.products,
            priceHistories: data.priceHistories,
            notifications: data.notifications,
            errorLogs: data.errorLogs,
            systemLogs: data.systemLogs,
            noticeSettings: data.noticeSettings
        },
        {
            upsert: true
        }
    );
}
// 숫자가 한 자리면 앞에 0을 붙인다
function twoNumber(number) {

    if (number < 10) {
        return "0" + number;
    }

    return number;
}


// 현재 시간을 문자열로 만든다
function makeKoreaTimeText(date) {
    let koreaDate = new Date(
        date.toLocaleString("en-US", { timeZone: "Asia/Seoul" })
    );

    let year = koreaDate.getFullYear();
    let month = koreaDate.getMonth() + 1;
    let day = koreaDate.getDate();
    let hour = koreaDate.getHours();
    let minute = koreaDate.getMinutes();

    return year + "-" + twoNumber(month) + "-" + twoNumber(day)
        + " " + twoNumber(hour) + ":" + twoNumber(minute);
}


// 현재 한국 시간 구하기
function getNowText() {
    return makeKoreaTimeText(new Date());
}


// 다음 가격 확인 예정 시간 구하기
function getNextCheckText() {
    let next = new Date();

    next.setMinutes(next.getMinutes() + 1);

    return makeKoreaTimeText(next);
}


// 랜덤 숫자 생성
function randomNumber(min, max) {

    return Math.floor(Math.random() * (max - min + 1)) + min;
}


// 모의 가격 수집 결과를 만든다
function mockCollectPrice(currentPrice) {

    let resultNumber = randomNumber(1, 100);

    // 1~5: 수집 실패
    if (resultNumber <= 5) {
        return {
            result: "fail",
            price: currentPrice
        };
    }

    // 6~10: 품절
    if (resultNumber <= 10) {
        return {
            result: "soldout",
            price: currentPrice
        };
    }

    // 나머지: 정상 가격 수집
    let changePrice = randomNumber(-20000, 10000);
    let newPrice = currentPrice + changePrice;

    if (newPrice < 1000) {
        newPrice = 1000;
    }

    return {
        result: "success",
        price: newPrice
    };
}


// 가격 이력을 저장한다
function savePriceHistory(data, productId, price) {

    let history = {
        historyId: "H" + Date.now() + randomNumber(1, 999),
        productPriceId: productId,
        price: price,
        collectedTime: getNowText()
    };

    data.priceHistories.push(history);
}


// 시스템 로그를 저장한다
function addSystemLog(data, content) {

    let log = {
        time: getNowText(),
        content: content
    };

    data.systemLogs.push(log);
}


// 오류 로그를 저장한다
function addErrorLog(data, productId, errorType, message) {

    let errorLog = {
        errorid: "E" + Date.now() + randomNumber(1, 999),
        productid: productId,
        errorType: errorType,
        message: message,
        createTime: getNowText()
    };

    data.errorLogs.push(errorLog);
}
// 사용자별 알림 설정을 가져온다
function getUserNoticeSetting(data, userId) {

    if (data.noticeSettings[userId] === undefined) {

        data.noticeSettings[userId] = {
            noticeType: "web",
            email: ""
        };
    }

    return data.noticeSettings[userId];
}


// 목표 가격 도달 알림을 만든다
function createNotice(data, product) {

    let setting = getUserNoticeSetting(data, product.PuserId);

    let noticeType = setting.noticeType;
    let email = setting.email;

    let noticeMessage = product.productName + " 상품이 목표 가격 이하가 되었습니다.";

    if (noticeType === "email" && email !== "") {
        noticeMessage = product.productName + " 상품이 목표 가격 이하가 되어 이메일 알림이 발송되었습니다.";
    }

    let notice = {
        notificationId: "N" + Date.now() + randomNumber(1, 999),
        NuserId: product.PuserId,
        productId: product.productId,
        productName: product.productName,
        currentPrice: product.curPrice,
        targetPrice: product.targetPrice,
        message: noticeMessage,
        createTime: getNowText(),
        sendNotice: true,
        noticeType: noticeType,
        email: email,
        isRead: false
    };

    data.notifications.push(notice);

    addSystemLog(data, product.productName + " 목표 가격 도달 알림 생성");
}


// 가격 추적 기능
// 가격 추적 기능
async function runPriceTracking(targetUserId) {

    let data = await loadData();
    let count = 0;

    for (let i = 0; i < data.products.length; i++) {

        let product = data.products[i];

        if (targetUserId === null || product.PuserId === targetUserId) {

            count++;

            let collectResult = mockCollectPrice(product.curPrice);

            product.lastCheck = getNowText();
            product.nextCheck = getNextCheckText();

            // 가격 수집 실패
            if (collectResult.result === "fail") {

                product.status = "수집 실패";

                addErrorLog(
                    data,
                    product.productId,
                    "가격 수집 실패",
                    product.productName + " 상품의 가격 정보를 수집하지 못했습니다."
                );

                continue;
            }

            // 품절 상태
            if (collectResult.result === "soldout") {

                product.status = "품절";

                addErrorLog(
                    data,
                    product.productId,
                    "품절",
                    product.productName + " 상품이 품절 상태로 확인되었습니다."
                );

                continue;
            }

            // 정상 수집
            let newPrice = collectResult.price;

            product.curPrice = newPrice;

            savePriceHistory(data, product.productId, newPrice);

            if (selectedProduct.status !== "품절" && selectedProduct.status !== "수집 실패") {

                if (selectedProduct.curPrice <= selectedProduct.targetPrice) {
                    selectedProduct.status = "목표가 도달";
                } else {
                    selectedProduct.status = "추적 중";
                }
            }
        }
    }

    await saveData(data);

    return count;
}


// 전체 데이터 조회
app.get("/api/data", async function (req, res) {

    try {

        let data = await loadData();

        res.json(data);

    } catch (error) {

        res.status(500).json({
            result: "fail",
            message: "데이터를 불러오지 못했습니다."
        });
    }
});


// 전체 데이터 저장
app.post("/api/save", async function (req, res) {

    try {

        let data = req.body;

        await saveData(data);

        res.json({
            result: "ok"
        });

    } catch (error) {

        res.status(500).json({
            result: "fail",
            message: "데이터 저장에 실패했습니다."
        });
    }
});


// 사용자가 가격 추적 실행 버튼을 눌렀을 때
app.post("/api/track-now", async function (req, res) {

    try {

        let userId = req.body.userId;

        let count = await runPriceTracking(userId);

        if (count === 0) {

            let data = await loadData();

            addErrorLog(
                data,
                "-",
                "수집 실패",
                "등록된 상품이 없어 가격 정보를 수집하지 못했습니다."
            );

            await saveData(data);

            res.json({
                result: "fail",
                message: "등록된 상품이 없습니다."
            });

            return;
        }

        res.json({
            result: "ok",
            message: "가격 추적이 완료되었습니다."
        });

    } catch (error) {

        res.status(500).json({
            result: "fail",
            message: "가격 추적 중 오류가 발생했습니다."
        });
    }
});


// 서버가 켜져 있는 동안 자동으로 가격을 갱신한다
setInterval(async function () {

    try {

        await runPriceTracking(null);

    } catch (error) {

        console.log("자동 가격 수집 실패:", error.message);
    }

}, checkInterval);


// MongoDB 연결 후 서버 실행
async function startServer() {

    if (!MONGO_URI) {

        console.log("MongoDB 연결 주소가 설정되지 않았습니다.");
        return;
    }

    try {

        await mongoose.connect(MONGO_URI);

        console.log("MongoDB Atlas 연결 성공");

        app.listen(port, function () {
            console.log("Price Tracking Secretary server start");
            console.log("http://localhost:" + port);
        });

    } catch (error) {

        console.log("MongoDB 연결 실패:", error.message);
    }
}

startServer();