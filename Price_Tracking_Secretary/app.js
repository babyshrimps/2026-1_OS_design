// 사용자 계정

let users = [
    {
        userId: "U001",
        username: "demo",
        password: "1234",
        email: "demo@test.com"
    },
    {
        userId: "U002",
        username: "kje",
        password: "1234",
        email: "kje@test.com"
    }
];


// 관리자 계정

let admins = [
    {
        adminId: "A001",
        adminname: "yu",
        adpassword: "0000"
    }
];


// 현재 로그인한 사람 저장

let currentUser = null;
let currentRole = "";


// 데이터 저장 배열

let systemLogs = [];
let products = [];
let priceHistories = [];
let notifications = [];
let errorLogs = [];
let noticeSettings = {};


// 페이지가 열리면 서버 데이터 먼저 불러오기

window.onload = async function () {

    await loadData();

    restoreLogin();

    startClientRefresh();

};



// 로그인 기능

async function login() {

    let inputId = document.getElementById("login-id").value;
    let inputPassword = document.getElementById("login-password").value;
    let message = document.getElementById("login-message");


    if (inputId === "" || inputPassword === "") {

        message.innerText = "이 입력란을 작성하세요.";

        return;
    }


    for (let i = 0; i < users.length; i++) {

        if (users[i].username === inputId && users[i].password === inputPassword) {

            currentUser = users[i];
            currentRole = "user";

            message.innerText = "";

            document.getElementById("login-page").classList.add("hidden");
            document.getElementById("admin-page").classList.add("hidden");
            document.getElementById("user-page").classList.remove("hidden");

            document.getElementById("user-name-text").innerText =
                currentUser.username + "님 환영합니다.";

            showUserMenu("main-page");
            updateMainInfo();
            loadNoticeSetting();

            addSystemLog(currentUser.username + " 사용자 로그인");

            await saveData();

            return;
        }
    }


    for (let i = 0; i < admins.length; i++) {

        if (admins[i].adminname === inputId && admins[i].adpassword === inputPassword) {

            currentUser = admins[i];
            currentRole = "admin";

            message.innerText = "";

            document.getElementById("login-page").classList.add("hidden");
            document.getElementById("user-page").classList.add("hidden");
            document.getElementById("admin-page").classList.remove("hidden");

            addSystemLog(currentUser.adminname + " 관리자 로그인");

            await saveData();

            showAdminPageLogs();

            return;
        }
    }


    message.innerText = "ID 또는 비밀번호가 올바르지 않습니다.";
}



// 로그아웃 기능

async function logout() {

    if (currentUser !== null) {

        if (currentRole === "user") {
            addSystemLog(currentUser.username + " 사용자 로그아웃");
        }

        if (currentRole === "admin") {
            addSystemLog(currentUser.adminname + " 관리자 로그아웃");
        }

        await saveData();
    }


    currentUser = null;
    currentRole = "";


    document.getElementById("login-id").value = "";
    document.getElementById("login-password").value = "";
    document.getElementById("login-message").innerText = "";


    document.getElementById("user-page").classList.add("hidden");
    document.getElementById("admin-page").classList.add("hidden");
    document.getElementById("login-page").classList.remove("hidden");

    localStorage.removeItem("currentUser");
    localStorage.removeItem("currentRole");
}



// 시스템 로그 저장

function addSystemLog(content) {

    let log = {
        time: getNowText(),
        content: content
    };

    systemLogs.push(log);
}



// 현재 시간 구하기

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



// 숫자가 한 자리면 앞에 0 붙이기

function twoNumber(number) {

    if (number < 10) {
        return "0" + number;
    }

    return number;
}



// 사용자 메뉴 화면 바꾸기

function showUserMenu(menuId) {

    let menus = document.getElementsByClassName("user-menu");

    for (let i = 0; i < menus.length; i++) {
        menus[i].classList.add("hidden");
    }


    document.getElementById(menuId).classList.remove("hidden");


    if (menuId === "main-page") {
        updateMainInfo();
    }

    if (menuId === "product-list-page") {
        showProductList();
    }

    if (menuId === "notification-page") {
        showNotificationList();
    }
}



// 메인 화면 숫자 바꾸기

function updateMainInfo() {

    if (currentUser === null || currentRole !== "user") {
        return;
    }


    let productCount = 0;
    let targetCount = 0;
    let unreadCount = 0;


    for (let i = 0; i < products.length; i++) {

        if (products[i].PuserId === currentUser.userId) {

            productCount++;

            if (products[i].status === "목표가 도달") {
                targetCount++;
            }
        }
    }


    for (let i = 0; i < notifications.length; i++) {

        if (notifications[i].NuserId === currentUser.userId && notifications[i].isRead === false) {
            unreadCount++;
        }
    }


    document.getElementById("product-count").innerText = productCount;
    document.getElementById("target-count").innerText = targetCount;
    document.getElementById("unread-count").innerText = unreadCount;
}



// 상품 등록 기능

async function addProduct() {

    let productName = document.getElementById("product-name").value;
    let productLink = document.getElementById("product-link").value;
    let targetPrice = document.getElementById("target-price").value;
    let message = document.getElementById("register-message");


    if (currentUser === null || currentRole !== "user") {

        message.innerText = "로그인 후 이용할 수 있습니다.";

        return;
    }


    if (productName === "" || productLink === "" || targetPrice === "") {

        message.innerText = "입력되지 않은 항목이 있습니다.";

        return;
    }


    if (productLink.indexOf("http://") !== 0 && productLink.indexOf("https://") !== 0) {

        message.innerText = "올바른 주소를 입력하세요.";

        addErrorLog("-", "링크 오류", productLink + " 주소 형식이 올바르지 않습니다.");

        await saveData();

        return;
    }


    targetPrice = Number(targetPrice);


    if (isNaN(targetPrice)) {

        message.innerText = "가격 입력 형식이 올바르지 않습니다.";

        return;
    }


    if (targetPrice <= 0) {

        message.innerText = "목표 가격은 0원보다 커야 합니다.";

        return;
    }


    let newProductId = "P" + Date.now();

    let firstPrice = targetPrice + randomNumber(5000, 30000);


    let newProduct = {
        productId: newProductId,
        PuserId: currentUser.userId,
        productName: productName,
        link: productLink,
        curPrice: firstPrice,
        targetPrice: targetPrice,
        status: "추적 중",
        addtime: getNowText(),
        lastCheck: "-",
        nextCheck: getNextCheckText(),
        lastNoticePrice: null
    };


    products.push(newProduct);


    let firstHistory = {
        historyId: "H" + Date.now(),
        productPriceId: newProductId,
        price: firstPrice,
        collectedTime: getNowText()
    };


    priceHistories.push(firstHistory);


    addSystemLog(productName + " 상품 등록");


    document.getElementById("product-name").value = "";
    document.getElementById("product-link").value = "";
    document.getElementById("target-price").value = "";


    await saveData();

    updateMainInfo();

    showUserMenu("product-list-page");
}



// 관심 상품 목록 보여주기

function showProductList() {

    let list = document.getElementById("product-list");
    let message = document.getElementById("product-list-message");

    list.innerHTML = "";
    message.innerText = "";


    if (currentUser === null || currentRole !== "user") {

        message.innerText = "로그인 후 이용할 수 있습니다.";

        return;
    }


    let count = 0;


    for (let i = 0; i < products.length; i++) {

        if (products[i].PuserId === currentUser.userId) {

            count++;


            let row = document.createElement("tr");


            row.innerHTML =
                "<td>" + products[i].productName + "</td>" +
                "<td><a href='" + products[i].link + "' target='_blank'>이동</a></td>" +
                "<td>" + products[i].curPrice.toLocaleString() + "원</td>" +
                "<td>" + products[i].targetPrice.toLocaleString() + "원</td>" +
                "<td>" + products[i].status + "</td>" +
                "<td>" +
                "<button onclick=\"showProductDetail('" + products[i].productId + "')\">상세</button>" +
                "<button onclick=\"changeTargetPrice('" + products[i].productId + "')\">목표가 변경</button>" +
                "<button onclick=\"deleteProduct('" + products[i].productId + "')\">삭제</button>" +
                "</td>";

            list.appendChild(row);
        }
    }


    if (count === 0) {

        message.innerText = "등록된 상품이 없습니다.";

    }
}



// 목표 가격 변경

async function changeTargetPrice(productId) {

    let selectedProduct = null;


    for (let i = 0; i < products.length; i++) {

        if (products[i].productId === productId) {
            selectedProduct = products[i];
        }
    }


    if (selectedProduct === null) {

        alert("상품 정보를 찾을 수 없습니다.");

        return;
    }


    let newTargetPrice = prompt(
        "새 목표 가격을 입력하세요.",
        selectedProduct.targetPrice
    );


    if (newTargetPrice === null) {
        return;
    }


    if (newTargetPrice === "") {

        alert("목표 가격을 입력해야 합니다.");

        return;
    }


    newTargetPrice = Number(newTargetPrice);


    if (isNaN(newTargetPrice) || newTargetPrice <= 0) {

        alert("올바른 가격을 입력하세요.");

        return;
    }


    selectedProduct.targetPrice = newTargetPrice;


    if (selectedProduct.curPrice <= selectedProduct.targetPrice) {
        selectedProduct.status = "목표가 도달";
    } else {
        selectedProduct.status = "추적 중";
    }


    addSystemLog(selectedProduct.productName + " 목표 가격 변경");

    await saveData();

    updateMainInfo();

    showProductList();

    alert("목표 가격이 변경되었습니다.");
}



// 상품 삭제

async function deleteProduct(productId) {

    let result = confirm("정말 이 상품을 삭제하시겠습니까?");


    if (result === false) {
        return;
    }


    let deletedProductName = "";


    for (let i = products.length - 1; i >= 0; i--) {

        if (products[i].productId === productId) {

            deletedProductName = products[i].productName;

            products.splice(i, 1);
        }
    }


    for (let i = priceHistories.length - 1; i >= 0; i--) {

        if (priceHistories[i].productPriceId === productId) {

            priceHistories.splice(i, 1);
        }
    }


    for (let i = notifications.length - 1; i >= 0; i--) {

        if (notifications[i].productId === productId) {

            notifications.splice(i, 1);
        }
    }


    if (deletedProductName !== "") {
        addSystemLog(deletedProductName + " 상품 삭제");
    }


    await saveData();

    updateMainInfo();

    showProductList();

    alert("상품이 삭제되었습니다.");
}



// 상품 상세 조회

function showProductDetail(productId) {

    let selectedProduct = null;


    for (let i = 0; i < products.length; i++) {

        if (products[i].productId === productId) {

            selectedProduct = products[i];

        }
    }


    if (selectedProduct === null) {

        alert("상품 정보를 찾을 수 없습니다.");

        return;
    }


    showUserMenu("product-detail-page");


    document.getElementById("detail-product-name").innerText = selectedProduct.productName;

    document.getElementById("detail-product-link").href = selectedProduct.link;

    document.getElementById("detail-current-price").innerText =
        selectedProduct.curPrice.toLocaleString() + "원";

    document.getElementById("detail-target-price").innerText =
        selectedProduct.targetPrice.toLocaleString() + "원";

    document.getElementById("detail-status").innerText = selectedProduct.status;

    document.getElementById("detail-addtime").innerText = selectedProduct.addtime;

    document.getElementById("detail-last-check").innerText = selectedProduct.lastCheck;

    document.getElementById("detail-next-check").innerText = selectedProduct.nextCheck;


    showPriceHistory(productId, selectedProduct.targetPrice);

    drawPriceChart(productId, selectedProduct.targetPrice);
}



// 가격 이력 보여주기

function showPriceHistory(productId, targetPrice) {

    let historyList = document.getElementById("price-history-list");
    let message = document.getElementById("price-history-message");

    historyList.innerHTML = "";
    message.innerText = "";


    let history = [];


    for (let i = 0; i < priceHistories.length; i++) {

        if (priceHistories[i].productPriceId === productId) {

            history.push(priceHistories[i]);

        }
    }


    if (history.length === 0) {

        message.innerText = "가격 이력이 없습니다.";

        return;
    }


    for (let i = history.length - 1; i >= 0; i--) {

        let compareText = "";

        if (history[i].price <= targetPrice) {
            compareText = "목표가 이하";
        } else {
            compareText = "목표가 초과";
        }


        let changeText = "";


        if (i === 0) {

            changeText = "첫 기록";

        } else {

            let changePrice = history[i].price - history[i - 1].price;


            if (changePrice > 0) {
                changeText = "+" + changePrice.toLocaleString() + "원";
            } else if (changePrice < 0) {
                changeText = changePrice.toLocaleString() + "원";
            } else {
                changeText = "변동 없음";
            }
        }


        let row = document.createElement("tr");

        row.innerHTML =
            "<td>" + history[i].collectedTime + "</td>" +
            "<td>" + history[i].price.toLocaleString() + "원</td>" +
            "<td>" + changeText + "</td>" +
            "<td>" + compareText + "</td>";


        historyList.appendChild(row);
    }
}



// 가격 이력 그래프 그리기

function drawPriceChart(productId, targetPrice) {

    let canvas = document.getElementById("price-chart");
    let message = document.getElementById("price-chart-message");

    let ctx = canvas.getContext("2d");


    canvas.width = canvas.offsetWidth;
    canvas.height = 260;


    ctx.clearRect(0, 0, canvas.width, canvas.height);

    message.innerText = "";


    let history = [];


    for (let i = 0; i < priceHistories.length; i++) {

        if (priceHistories[i].productPriceId === productId) {

            history.push(priceHistories[i]);

        }
    }


    if (history.length === 0) {

        message.innerText = "그래프로 표시할 가격 이력이 없습니다.";

        return;
    }


    if (history.length === 1) {

        message.innerText = "가격 이력이 1개라서 그래프 변화는 아직 확인하기 어렵습니다.";

    }


    let prices = [];


    for (let i = 0; i < history.length; i++) {

        prices.push(history[i].price);

    }


    prices.push(targetPrice);


    let maxPrice = Math.max.apply(null, prices);
    let minPrice = Math.min.apply(null, prices);


    if (maxPrice === minPrice) {
        maxPrice = maxPrice + 10000;
        minPrice = minPrice - 10000;
    }


    let left = 55;
    let right = 25;
    let top = 25;
    let bottom = 45;

    let graphWidth = canvas.width - left - right;
    let graphHeight = canvas.height - top - bottom;


    // 배경
    ctx.fillStyle = "#fffdf2";
    ctx.fillRect(0, 0, canvas.width, canvas.height);


    // 축
    ctx.strokeStyle = "#8a7a4a";
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(left, top);
    ctx.lineTo(left, top + graphHeight);
    ctx.lineTo(left + graphWidth, top + graphHeight);
    ctx.stroke();


    // 목표 가격 선
    let targetY = top + graphHeight - ((targetPrice - minPrice) / (maxPrice - minPrice)) * graphHeight;

    ctx.strokeStyle = "#cc0000";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

    ctx.beginPath();
    ctx.moveTo(left, targetY);
    ctx.lineTo(left + graphWidth, targetY);
    ctx.stroke();

    ctx.setLineDash([]);

    ctx.fillStyle = "#cc0000";
    ctx.font = "12px Arial";
    ctx.fillText("목표가", left + 5, targetY - 5);


    // 가격 선
    ctx.strokeStyle = "#7a5600";
    ctx.lineWidth = 2;

    ctx.beginPath();


    for (let i = 0; i < history.length; i++) {

        let x;

        if (history.length === 1) {
            x = left + graphWidth / 2;
        } else {
            x = left + (graphWidth / (history.length - 1)) * i;
        }


        let y = top + graphHeight - ((history[i].price - minPrice) / (maxPrice - minPrice)) * graphHeight;


        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }


    ctx.stroke();


    // 점 찍기
    for (let i = 0; i < history.length; i++) {

        let x;

        if (history.length === 1) {
            x = left + graphWidth / 2;
        } else {
            x = left + (graphWidth / (history.length - 1)) * i;
        }


        let y = top + graphHeight - ((history[i].price - minPrice) / (maxPrice - minPrice)) * graphHeight;


        ctx.fillStyle = "#f0c338";
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "#7a5600";
        ctx.stroke();


        ctx.fillStyle = "#222";
        ctx.font = "11px Arial";
        ctx.fillText(history[i].price.toLocaleString(), x - 20, y - 10);
    }


    // 최소, 최대 가격 표시
    ctx.fillStyle = "#333";
    ctx.font = "12px Arial";

    ctx.fillText(maxPrice.toLocaleString(), 5, top + 5);
    ctx.fillText(minPrice.toLocaleString(), 5, top + graphHeight);

    ctx.fillText("가격 수집 순서", left + graphWidth / 2 - 35, canvas.height - 10);
}



// 가격 추적 직접 실행

async function runPriceTracking() {

    if (currentUser === null || currentRole !== "user") {

        alert("로그인 후 이용할 수 있습니다.");

        return;
    }


    try {

        let response = await fetch("/api/track-now", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                userId: currentUser.userId
            })
        });


        let result = await response.json();

        await loadData();

        updateMainInfo();

        showProductList();

        showNotificationList();

        alert(result.message);

    } catch (error) {

        alert("서버와 연결할 수 없습니다.");
    }
}



// 12시간 뒤 시간 구하기

function getNextCheckText() {

    let next = new Date();

    next.setHours(next.getHours() + 12);


    let year = next.getFullYear();
    let month = next.getMonth() + 1;
    let date = next.getDate();
    let hour = next.getHours();
    let minute = next.getMinutes();


    return year + "-" + twoNumber(month) + "-" + twoNumber(date)
        + " " + twoNumber(hour) + ":" + twoNumber(minute);
}



// 랜덤 숫자 만들기

function randomNumber(min, max) {

    return Math.floor(Math.random() * (max - min + 1)) + min;

}



// 모의 가격 데이터 만들기

function mockPriceData(currentPrice) {

    let changePrice = randomNumber(-20000, 10000);

    let newPrice = currentPrice + changePrice;


    if (newPrice < 1000) {

        newPrice = 1000;

    }


    return newPrice;
}



// 가격 이력 저장

function savePriceHistory(productId, price) {

    let history = {
        historyId: "H" + Date.now() + randomNumber(1, 999),
        productPriceId: productId,
        price: price,
        collectedTime: getNowText()
    };


    priceHistories.push(history);
}



// 알림 생성

function createNotice(product) {

    let setting = getUserNoticeSetting(currentUser.userId);

    let noticeType = setting.noticeType;
    let email = setting.email;


    let noticeMessage = product.productName + " 상품이 목표 가격 이하가 되었습니다.";


    if (noticeType === "email" && email !== "") {
        noticeMessage = product.productName + " 상품이 목표 가격 이하가 되어 이메일 알림이 발송되었습니다.";
    }


    let notice = {
        notificationId: "N" + Date.now() + randomNumber(1, 999),
        NuserId: currentUser.userId,
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


    notifications.push(notice);

    addSystemLog(product.productName + " 목표 가격 도달 알림 생성");
}



// 알림 내역 보여주기

function showNotificationList() {

    loadNoticeSetting();

    let list = document.getElementById("notification-list");
    let message = document.getElementById("notification-message");

    list.innerHTML = "";
    message.innerText = "";


    if (currentUser === null || currentRole !== "user") {

        message.innerText = "로그인 후 이용할 수 있습니다.";

        return;
    }


    let count = 0;


    for (let i = notifications.length - 1; i >= 0; i--) {

        if (notifications[i].NuserId === currentUser.userId) {

            count++;


            let noticeBox = document.createElement("div");

            if (notifications[i].isRead === true) {
                noticeBox.className = "notice-box read-notice";
            } else {
                noticeBox.className = "notice-box unread-notice";
            }


            let readText = "읽지 않음";

            if (notifications[i].isRead === true) {
                readText = "읽음";
            }


            let noticeTypeText = "웹 알림";

            if (notifications[i].noticeType === "email") {
                noticeTypeText = "이메일 알림";
            }


            let emailText = "";

            if (notifications[i].noticeType === "email" && notifications[i].email !== "") {
                emailText = "<p>수신 이메일 : " + notifications[i].email + "</p>";
            }


            noticeBox.innerHTML =
                "<span class='read-badge'>" + readText + "</span>" +
                "<p class='notice-title'>" + notifications[i].message + "</p>" +
                "<p>알림 방식 : " + noticeTypeText + "</p>" +
                emailText +
                "<p>현재 가격 : " + notifications[i].currentPrice.toLocaleString() + "원</p>" +
                "<p>목표 가격 : " + notifications[i].targetPrice.toLocaleString() + "원</p>" +
                "<p>생성 시간 : " + notifications[i].createTime + "</p>" +
                "<button onclick=\"showProductDetail('" + notifications[i].productId + "')\">상품 보기</button>" +
                "<button onclick=\"markNoticeRead('" + notifications[i].notificationId + "')\">읽음 처리</button>";


            list.appendChild(noticeBox);
        }
    }


    if (count === 0) {

        message.innerText = "알림 내역이 없습니다.";

    }
}



// 데이터 서버 저장

async function saveData() {

    let data = {
        products: products,
        priceHistories: priceHistories,
        notifications: notifications,
        errorLogs: errorLogs,
        systemLogs: systemLogs,
        noticeSettings: noticeSettings
    };


    try {

        await fetch("/api/save", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

    } catch (error) {

        console.log("서버 저장 실패");
    }


    if (currentUser !== null) {
        localStorage.setItem("currentUser", JSON.stringify(currentUser));
        localStorage.setItem("currentRole", currentRole);
    }
}



// 데이터 서버 불러오기

async function loadData() {

    try {

        let response = await fetch("/api/data");

        let data = await response.json();

        products = data.products || [];
        priceHistories = data.priceHistories || [];
        notifications = data.notifications || [];
        errorLogs = data.errorLogs || [];
        systemLogs = data.systemLogs || [];
        noticeSettings = data.noticeSettings || {};

    } catch (error) {

        console.log("서버 데이터 불러오기 실패");
    }
}



// 로그인 상태 복구

function restoreLogin() {

    let savedUser = localStorage.getItem("currentUser");
    let savedRole = localStorage.getItem("currentRole");


    if (savedUser !== null && savedRole !== null) {

        currentUser = JSON.parse(savedUser);
        currentRole = savedRole;


        document.getElementById("login-page").classList.add("hidden");


        if (currentRole === "user") {

            document.getElementById("admin-page").classList.add("hidden");
            document.getElementById("user-page").classList.remove("hidden");

            document.getElementById("user-name-text").innerText =
                currentUser.username + "님 환영합니다.";

            showUserMenu("main-page");
            updateMainInfo();
            loadNoticeSetting();

        }


        if (currentRole === "admin") {

            document.getElementById("user-page").classList.add("hidden");
            document.getElementById("admin-page").classList.remove("hidden");

            showAdminPageLogs();

        }
    }
}



// 관리자 로그 화면 전체 출력

function showAdminPageLogs() {

    showAdminNoticeLogs();

    showAdminErrorLogs();

    showAdminSystemLogs();
}



// 관리자 알림 로그

function showAdminNoticeLogs() {

    let list = document.getElementById("admin-notice-log-list");
    let message = document.getElementById("admin-notice-log-message");

    list.innerHTML = "";
    message.innerText = "";


    if (notifications.length === 0) {

        message.innerText = "알림 발송 기록이 없습니다.";

        return;
    }


    for (let i = notifications.length - 1; i >= 0; i--) {

        let noticeTypeText = "웹 알림";

        if (notifications[i].noticeType === "email") {
            noticeTypeText = "이메일 알림";
        }


        let emailText = "";

        if (notifications[i].noticeType === "email" && notifications[i].email !== "") {
            emailText = " / 수신 이메일: " + notifications[i].email;
        }


        let row = document.createElement("tr");

        row.innerHTML =
            "<td>알림</td>" +
            "<td>" + notifications[i].productName + " 상품 목표 가격 도달 알림 발송 (" + noticeTypeText + emailText + ")</td>" +
            "<td>" + notifications[i].createTime + "</td>";

        list.appendChild(row);
    }
}



// 관리자 오류 로그

function showAdminErrorLogs() {

    let list = document.getElementById("admin-error-log-list");
    let message = document.getElementById("admin-error-log-message");

    list.innerHTML = "";
    message.innerText = "";


    if (errorLogs.length === 0) {

        message.innerText = "예외 상황 기록이 없습니다.";

        return;
    }


    for (let i = errorLogs.length - 1; i >= 0; i--) {

        let row = document.createElement("tr");

        row.innerHTML =
            "<td>" + errorLogs[i].errorType + "</td>" +
            "<td>" + errorLogs[i].message + "</td>" +
            "<td>" + errorLogs[i].createTime + "</td>";

        list.appendChild(row);
    }
}



// 관리자 시스템 로그

function showAdminSystemLogs() {

    let list = document.getElementById("admin-system-log-list");
    let message = document.getElementById("admin-system-log-message");

    list.innerHTML = "";
    message.innerText = "";


    if (systemLogs.length === 0) {

        message.innerText = "시스템 로그가 없습니다.";

        return;
    }


    for (let i = systemLogs.length - 1; i >= 0; i--) {

        let row = document.createElement("tr");

        row.innerHTML =
            "<td>시스템</td>" +
            "<td>" + systemLogs[i].content + "</td>" +
            "<td>" + systemLogs[i].time + "</td>";

        list.appendChild(row);
    }
}



// 오류 로그 저장

function addErrorLog(productId, errorType, message) {

    let errorLog = {
        errorid: "E" + Date.now() + randomNumber(1, 999),
        productid: productId,
        errorType: errorType,
        message: message,
        createTime: getNowText()
    };


    errorLogs.push(errorLog);
}



// 사용자 알림 설정 가져오기

function getUserNoticeSetting(userId) {

    if (noticeSettings[userId] === undefined) {

        noticeSettings[userId] = {
            noticeType: "web",
            email: ""
        };

    }


    return noticeSettings[userId];
}



// 알림 설정 저장

async function saveNoticeSetting() {

    if (currentUser === null || currentRole !== "user") {
        return;
    }


    let noticeTypeInputs = document.getElementsByName("notice-type");
    let selectedType = "web";

    for (let i = 0; i < noticeTypeInputs.length; i++) {

        if (noticeTypeInputs[i].checked === true) {
            selectedType = noticeTypeInputs[i].value;
        }
    }


    let email = document.getElementById("notice-email").value;
    let message = document.getElementById("notice-setting-message");


    if (selectedType === "email" && email === "") {

        message.innerText = "이메일 알림을 선택한 경우 이메일 주소를 입력해야 합니다.";

        return;
    }


    noticeSettings[currentUser.userId] = {
        noticeType: selectedType,
        email: email
    };


    await saveData();

    message.innerText = "알림 설정이 저장되었습니다.";
}



// 알림 설정 불러오기

function loadNoticeSetting() {

    if (currentUser === null || currentRole !== "user") {
        return;
    }


    let setting = getUserNoticeSetting(currentUser.userId);

    let noticeTypeInputs = document.getElementsByName("notice-type");

    for (let i = 0; i < noticeTypeInputs.length; i++) {

        if (noticeTypeInputs[i].value === setting.noticeType) {
            noticeTypeInputs[i].checked = true;
        }
    }


    let emailInput = document.getElementById("notice-email");

    if (emailInput !== null) {
        emailInput.value = setting.email;
    }
}



// 알림 하나 읽음 처리

async function markNoticeRead(notificationId) {

    for (let i = 0; i < notifications.length; i++) {

        if (notifications[i].notificationId === notificationId) {

            notifications[i].isRead = true;

        }
    }


    await saveData();

    updateMainInfo();

    showNotificationList();
}



// 모든 알림 읽음 처리

async function markAllNoticesRead() {

    if (currentUser === null || currentRole !== "user") {
        return;
    }


    for (let i = 0; i < notifications.length; i++) {

        if (notifications[i].NuserId === currentUser.userId) {

            notifications[i].isRead = true;

        }
    }


    await saveData();

    updateMainInfo();

    showNotificationList();

    alert("모든 알림을 읽음 처리했습니다.");
}



// 서버에서 바뀐 데이터 화면에 반영하기

function startClientRefresh() {

    setInterval(async function () {

        if (currentUser === null) {
            return;
        }


        await loadData();


        if (currentRole === "user") {

            updateMainInfo();


            if (!document.getElementById("product-list-page").classList.contains("hidden")) {
                showProductList();
            }


            if (!document.getElementById("notification-page").classList.contains("hidden")) {
                showNotificationList();
            }


            if (!document.getElementById("product-detail-page").classList.contains("hidden")) {
                let productName = document.getElementById("detail-product-name").innerText;

                for (let i = 0; i < products.length; i++) {
                    if (products[i].productName === productName && products[i].PuserId === currentUser.userId) {
                        showProductDetail(products[i].productId);
                    }
                }
            }
        }


        if (currentRole === "admin") {
            showAdminPageLogs();
        }

    }, 5000);
}