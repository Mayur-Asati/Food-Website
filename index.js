const express = require('express')
const ejs = require('ejs')
const bodyParser = require('body-parser')
const mysql = require('mysql')
const session = require("express-session")
const app = express();

app.use(express.static('public'));

app.set('view engine', 'ejs');


function isProductInCart(cart, id) {

    for (let i = 0; i < cart.length; i++) {
        if (cart[i].id === id) {
            return true
        }
    }

    return false
}

function calculateTotal(cart, req) {
    let total = 0;
    for (let i = 0; i < cart.length; i++) {
        if (cart[i].sale_price) {
            total += (cart[i].sale_price * cart[i].quantity);
        }
        else {
            total += (cart[i].price * cart[i].quantity);
        }
    }
    req.session.total = total;
    return total;
}

app.listen('8080')
app.use(bodyParser.urlencoded({ extended: true }))
app.use(session({ secret: "secrat" }))

app.get('/', (req, res) => {

    const con = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "",
        database: "node_project"
    })

    con.query("SELECT * FROM products", (err, result) => {
        res.render('pages/index', { result: result })
    })



})

app.post('/add_to_cart', (req, res) => {

    const id = req.body.id;
    const name = req.body.name;
    const price = req.body.price;
    const sale_price = req.body.sale_price;
    const quantity = req.body.quantity;
    const image = req.body.image;
    const product = { id, name, price, sale_price, quantity, image }


    if (req.session.cart) {
        let cart = req.session.cart;

        if (!isProductInCart(cart, id)) {
            cart.push(product);
        }
    }
    else {
        req.session.cart = [product]
        cart = req.session.cart
    }

    // calculate total

    calculateTotal(cart, req);

    // return cart

    res.redirect('/cart')

})


app.get('/cart', (req, res) => {

    const cart = req.session.cart;
    const total = req.session.total;

    res.render('pages/cart', { cart, total })
})

app.post('/remove_product', (req, res) => {

    const id = req.body.id;
    const cart = req.session.cart;

    for (let i = 0; i < cart.length; i++) {
        if (cart[i].id === id) {
            cart.splice(cart.indexOf(i), 1)
        }
    }

    // cart.filter((ele, index)=>{
    //     return ele.id !== id
    // })


    calculateTotal(cart, req);
    res.redirect('/cart')

})

app.post('/edit_product_quantity', (req, res) => {

    const id = req.body.id;
    const quantity = req.body.quantity;
    const increase_btn = req.body.increase_product_quantity;
    const decrease_btn = req.body.decrease_product_quantity;

    const cart = req.session.cart;
    if (increase_btn) {
        for (let i = 0; i < cart.length; i++) {
            if (cart[i].id === id) {
                if (cart[i].quantity > 0) {
                    cart[i].quantity = parseInt(cart[i].quantity) + 1
                }
            }
        }
    }


    if (decrease_btn) {
        for (let i = 0; i < cart.length; i++) {
            if (cart[i].id === id) {
                if (cart[i].quantity > 1) {
                    cart[i].quantity = parseInt(cart[i].quantity) - 1
                }
            }
        }
    }

    calculateTotal(cart, req);
    res.redirect('/cart')
})


app.get('/checkout', (req, res) => {
    const total = req.session.total;
    res.render('pages/checkout', { total })
})

app.post('/place_order', (req, res) => {

    const name = req.body.name;
    const email = req.body.email;
    const phone = req.body.phone;
    const city = req.body.city;
    const address = req.body.address;
    const cost = req.body.cost;
    const status = "not paid";
    const date = new Date();
    let products_ids = "";
    const id = Date.now();
    req.session.order_id = id

    const con = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "",
        database: "node_project"
    })

    const cart = req.session.cart;

    for (let i = 0; i < cart.length; i++) {
        products_ids = products_ids + ", " + cart[i].id
    }

    con.connect((err) => {
        if (err) {
            console.log(err)
        }
        else {
            const query = "INSERT INTO orders (id,cost,name,email,status,city,address,phone,date,products_ids) VALUES ?"
            const values = [
                [id,cost,name,email,status,city,address,phone,date,products_ids]
            ];

            con.query(query, [values], (err, result) => {

                for (let i = 0; i < cart.length; i++) {
                    const query = "INSERT INTO order_items (order_id,product_id,product_name,product_price,product_image,product_quantity,order_date) VALUES ?"
                    const values = [
                        [id, cart[i].id, cart[i].name, cart[i].price, cart[i].image, cart[i].quantity, new Date()]
                    ];
                    con.query(query, [values], (err, result) => {

                    })

                }
                res.redirect('/payment')
            })
        }
    })
})

app.get('/payment', (req, res) => {
    const total = req.session.total;
    res.render('pages/payment', { total })
})

app.get('/verify_payment', (req, res) => {
    var transection_id = req.query.transection_id;
    const order_id = req.session.id;


    const con = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "",
        database: "node_project"
    })

    con.connect((err) => {
        if (err) {
            console.log(err)
        }
        else {
            const query = "INSERT INTO payments (order_id,transection_id,date) VALUES ?"
            const values = [
                [order_id, transection_id, new Date()]
            ]
            con.query(query, [values], (err, result) => {

                con.query("UPDATE order SET status='paid' WHERE id=' "+order_id+" ' ",(err,result)=>{})
                res.redirect('thank_you', { order_id })
            })
        } 
    })
})

app.get("/thank_you",(req,res)=>{
    const order_id = req.session.order_id;
    res.render('pages/thank_you',{order_id})
})


app.get('/single_product', (req, res) => {

    const id = req.query.id

    
    const con = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "",
        database: "node_project"
    })

    con.query("SELECT * FROM products WHERE id=' "+id+" ' ", (err, result) => {
        res.render('pages/single_product', { result: result })
    })


})


app.get('/products', (req, res) => {

    
    const con = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "",
        database: "node_project"
    })

    con.query("SELECT * FROM products", (err, result) => {
        res.render('pages/products', { result: result })
    })


})


app.get('/about', (req, res) => {
    res.render('pages/about')
})