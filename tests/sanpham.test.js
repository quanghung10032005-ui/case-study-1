const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "sanpham.html"), "utf8");
const inlineScript = html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
const productScript = fs.readFileSync(path.join(root, "Product.js"), "utf8");

class Element {
    constructor(tagName = "") {
        this.tagName = tagName;
        this.children = [];
        this.style = {};
        this.value = "";
        this.textContent = "";
    }

    appendChild(child) {
        this.children.push(child);
        return child;
    }

    replaceChildren(...children) {
        this.children = children;
    }
}

function createPage(initialProducts) {
    const storage = new Map();
    if (initialProducts !== undefined) {
        storage.set("products", typeof initialProducts === "string"
            ? initialProducts
            : JSON.stringify(initialProducts));
    }

    const elements = new Map();
    const alerts = [];
    const errors = [];
    const document = {
        getElementById(id) {
            if (!elements.has(id)) {
                elements.set(id, new Element());
            }
            return elements.get(id);
        },
        createElement(tagName) {
            return new Element(tagName);
        }
    };
    const context = vm.createContext({
        document,
        localStorage: {
            getItem(key) {
                return storage.has(key) ? storage.get(key) : null;
            },
            setItem(key, value) {
                storage.set(key, String(value));
            }
        },
        alert(message) {
            alerts.push(message);
        },
        confirm() {
            return true;
        },
        console: {
            error(...args) {
                errors.push(args);
            }
        },
        window: { location: {} }
    });

    vm.runInContext(productScript, context);
    vm.runInContext(inlineScript, context);
    return { context, document, storage, alerts, errors };
}

function setValues(document, prefix, values) {
    const fields = ["ma", "ten", "gia", "soluong", "mota"];
    fields.forEach((field, index) => {
        document.getElementById(`${prefix}${field}`).value = values[index];
    });
}

test("khởi tạo dữ liệu mẫu khi chưa có dữ liệu lưu", () => {
    // Arrange
    const page = createPage();

    // Act
    const products = vm.runInContext("products", page.context);

    // Assert
    assert.equal(products.length, 4);
    assert.equal(page.document.getElementById("listsanpham").children.length, 4);
});

test("giữ danh sách rỗng sau khi người dùng xóa hết sản phẩm", () => {
    // Arrange
    const page = createPage([]);

    // Act
    const products = vm.runInContext("products", page.context);

    // Assert
    assert.equal(products.length, 0);
    assert.equal(page.storage.get("products"), "[]");
});

test("báo lỗi và không dừng trang khi dữ liệu lưu không hợp lệ", () => {
    // Arrange
    const page = createPage("{invalid");

    // Act
    const products = vm.runInContext("products", page.context);

    // Assert
    assert.equal(products.length, 0);
    assert.equal(page.alerts[0], "Dữ liệu sản phẩm bị lỗi. Vui lòng kiểm tra lại!");
    assert.equal(page.errors.length, 1);
});

test("thêm sản phẩm hợp lệ có giá trị biên bằng không", () => {
    // Arrange
    const page = createPage([]);
    setValues(page.document, "", ["SP005", "Sản phẩm mới", "0", "0", "Mô tả"]);

    // Act
    page.context.add();

    // Assert
    const products = vm.runInContext("products", page.context);
    assert.equal(products.length, 1);
    assert.equal(products[0].gia, "0");
    assert.equal(products[0].soluong, "0");
    assert.equal(page.document.getElementById("listsanpham").children.length, 1);
});

test("từ chối trường chỉ chứa khoảng trắng", () => {
    // Arrange
    const page = createPage([]);
    setValues(page.document, "", ["SP005", "   ", "100", "1", "Mô tả"]);

    // Act
    page.context.add();

    // Assert
    assert.equal(vm.runInContext("products.length", page.context), 0);
    assert.deepEqual(page.alerts, ["Vui lòng điền đầy đủ thông tin!"]);
});

test("từ chối giá hoặc số lượng âm khi thêm sản phẩm", () => {
    // Arrange
    const invalidValues = [
        ["SP005", "Sản phẩm mới", "-1", "1", "Mô tả"],
        ["SP005", "Sản phẩm mới", "1", "-1", "Mô tả"]
    ];

    // Act
    const results = invalidValues.map(values => {
        const page = createPage([]);
        setValues(page.document, "", values);
        page.context.add();
        return {
            productCount: vm.runInContext("products.length", page.context),
            alertCount: page.alerts.length
        };
    });

    // Assert
    assert.deepEqual(results, [
        { productCount: 0, alertCount: 1 },
        { productCount: 0, alertCount: 1 }
    ]);
});

test("cập nhật sản phẩm và đồng bộ dữ liệu đã lưu", () => {
    // Arrange
    const page = createPage([{ ma: "SP001", ten: "Tên cũ", gia: 10, soluong: 2, mota: "Mô tả cũ" }]);
    setValues(page.document, "update", ["SP002", "Tên mới", "20", "3", "Mô tả mới"]);

    // Act
    page.context.update(0);

    // Assert
    const products = JSON.parse(page.storage.get("products"));
    assert.equal(products[0].ma, "SP002");
    assert.equal(products[0].ten, "Tên mới");
    assert.equal(page.document.getElementById("listsanpham").children.length, 1);
});

test("từ chối cập nhật sản phẩm với giá âm", () => {
    // Arrange
    const page = createPage([{ ma: "SP001", ten: "Sản phẩm", gia: 10, soluong: 2, mota: "Mô tả" }]);
    setValues(page.document, "update", ["SP001", "Sản phẩm", "-1", "2", "Mô tả"]);

    // Act
    page.context.update(0);

    // Assert
    const products = JSON.parse(page.storage.get("products"));
    assert.equal(products[0].gia, 10);
    assert.equal(page.alerts.length, 1);
});

test("xóa sản phẩm ở đầu danh sách", () => {
    // Arrange
    const page = createPage([
        { ma: "SP001", ten: "Sản phẩm đầu", gia: 10, soluong: 1, mota: "Mô tả" },
        { ma: "SP002", ten: "Sản phẩm cuối", gia: 20, soluong: 2, mota: "Mô tả" }
    ]);

    // Act
    page.context.deletedata(0);

    // Assert
    const products = JSON.parse(page.storage.get("products"));
    assert.equal(products.length, 1);
    assert.equal(products[0].ma, "SP002");
    assert.equal(page.document.getElementById("listsanpham").children.length, 1);
});

test("hiển thị dữ liệu sản phẩm như văn bản, không diễn giải nội dung HTML", () => {
    // Arrange
    const injectedText = '<img src=x onerror="alert(1)">';
    const page = createPage([{ ma: "SP001", ten: injectedText, gia: 1, soluong: 1, mota: "Mô tả" }]);

    // Act
    const nameCell = page.document.getElementById("listsanpham").children[0].children[1];

    // Assert
    assert.equal(nameCell.textContent, injectedText);
    assert.equal(nameCell.children.length, 0);
});

test("bỏ qua chỉ số không hợp lệ khi sửa hoặc xóa", () => {
    // Arrange
    const page = createPage([{ ma: "SP001", ten: "Sản phẩm", gia: 1, soluong: 1, mota: "Mô tả" }]);

    // Act
    page.context.sua(-1);
    page.context.deletedata(-1);
    page.context.update(1);

    // Assert
    assert.equal(vm.runInContext("products.length", page.context), 1);
    assert.equal(page.document.getElementById("updateform").style.display, undefined);
    assert.equal(page.alerts.length, 0);
});
