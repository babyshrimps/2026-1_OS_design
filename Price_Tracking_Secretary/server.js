const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

const dataFile = path.join(__dirname, "data.json");

// 테스트용: 10초마다 자동 가격 수집
// 제출용으로 12시간마다 하려면 12 * 60 * 60 * 1000 으로 바꾸면 됨
const checkInterval = 10000;

app.use(express.json());
app.use(express.static(__dirname));

function loadData() {

    if (!fs.existsSync(dataFile)) {
        return {
            products: [],
            priceHistories: [],
            notifications: [],
            errorLogs: [],
            systemLogs: [],
            noticeSettings: {}
        };
    }

    let text = fs.readFileSync(dataFile, "utf-8");
    let cleanText = text.trim().replace(/^\uFEFF/, '');

    return JSON.parse(cleanText);
}

function saveData(data) {
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 4));
}

function twoNumber(number) {

    if (number < 10) {
        return "0" + number;
    }

    return number;
}

function getNowText() {

    let now = new Date();

    let year = now.getFullYear();
    let month = now.getMonth() + 1;
    let date = now.getDate();
    let hour = now.getHours();
    let minute = now.getMinutes();

    return year + "-" + twoNumber(month) + "-" + twoNumber(date)
        + " " + twoNumber(hour) + ":" + twoNumber(minute);
}

function getNextCheckText() {

    let next = new Date();

    // 테스트용: 1분 뒤
    // 제출용: next.setHours(next.getHours() + 12);
    next.setMinutes(next.getMinutes() + 1);

    let year = next.getFullYear();
    let month = next.getMonth() + 1;
    let date = next.getDate();
    let hour = next.getHours();
    let minute = next.getMinutes();

    return year + "-" + twoNumber(month) + "-" + twoNumber(date)
        + " " + twoNumber(hour) + ":" + twoNumber(minute);
}

function randomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function mockPriceData(currentPrice) {

    let changePrice = randomNumber(-20000, 10000);
    let newPrice = currentPrice + changePrice;

    if (newPrice < 1000) {
        newPrice = 1000;
    }

    return newPrice;
}

function savePriceHistory(data, productId, price) {

    let history = {
        historyId: "H" + Date.now() + randomNumber(1, 999),
        productPriceId: productId,
        price: price,
        collectedTime: getNowText()
    };

    data.priceHistories.push(history);
}

function addSystemLog(data, content) {

    let log = {
        time: getNowText(),
        content: content
    };

    data.systemLogs.push(log);
}

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

function getUserNoticeSetting(data, userId) {

    if (data.noticeSettings[userId] === undefined) {
        data.noticeSettings[userId] = {
            noticeType: "web",
            email: ""
        };
    }

    return data.noticeSettings[userId];
}

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

function runPriceTracking(targetUserId) {

    let data = loadData();
    let count = 0;

    for (let i = 0; i < data.products.length; i++) {

        let product = data.products[i];

        if (targetUserId === null || product.PuserId === targetUserId) {

            count++;

            let newPrice = mockPriceData(product.curPrice);

            product.curPrice = newPrice;
            product.lastCheck = getNowText();
            product.nextCheck = getNextCheckText();

            savePriceHistory(data, product.productId, newPrice);

            if (newPrice <= product.targetPrice) {

                product.status = "목표가 도달";

                if (product.lastNoticePrice !== newPrice) {
                    createNotice(data, product);
                    product.lastNoticePrice = newPrice;
                }

            } else {
                product.status = "추적 중";
            }

            addSystemLog(data, product.productName + " 자동 가격 수집");
        }
    }

    saveData(data);

    return count;
}

app.get("/api/data", function (req, res) {

    let data = loadData();

    res.json(data);
});

app.post("/api/save", function (req, res) {

    let data = req.body;

    saveData(data);

    res.json({
        result: "ok"
    });
});

app.post("/api/track-now", function (req, res) {

    let userId = req.body.userId;

    let count = runPriceTracking(userId);

    if (count === 0) {

        let data = loadData();

        addErrorLog(
            data,
            "-",
            "수집 실패",
            "등록된 상품이 없어 가격 정보를 수집하지 못했습니다."
        );

        saveData(data);

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
});

setInterval(function () {

    runPriceTracking(null);

}, checkInterval);

app.listen(port, function () {

    console.log("Price Tracking Secretary server start");
    console.log("http://localhost:" + port);
});