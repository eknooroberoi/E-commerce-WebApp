const formidable = require("formidable");
const _ = require("lodash");
const fs = require("fs");

const Product = require("../models/product");
const { result } = require("lodash");
const { errorHandler } = require('../helpers/dbErrorHandler');

exports.productById = (req, res, next, id) => {
    Product.findById(id).exec((err, product) => {
        if(err || !product) {
            return res.status(400).json({
                error: "Product not found"
            });
        }
        req.product = product;
        next();
    });
};

exports.read = (req, res) => {
    req.product.photo = undefined;
    return res.json(req.product);
};
//we need to send form data because we have to handle image upload, when creating new category we can access anything we needed from request body
//but can't do this because we are handling image upload also, we need to send form data whether from client whether it is from react or postman
//we need to use form data, in order to use form data and all the files coming with it, we need to use package called formidable, other packages example: matla package to handle image upload
//also used lodash library
//created form is sent from react or postman
exports.create = (req,res) => {
    let form = new formidable.IncomingForm();
    form.keepExtensions = true;
    form.parse(req,(err, fields, files) => {
        if(err)
        {
            return res.status(400).json({
                error: "Image could not be uploaded"
            });
        }


        //check for all fields, make sure all fields are there
        const {name, description, price, category, quantity, shipping} = fields;
        if(!name || !description || !price || !category || !quantity || !shipping){
            return res.status(400).json({
                error: "All fields are required"
            });
        }



        let product = new Product(fields); //name,description etc
        //file size
        // 1 kb= 1000
        //1 mb = 1000000


        if(files.photo){
            //file validation example restricting file size(here not more than 1 mb), here checking the photo coming from client side
            //console.log("FILES PHOTO: ", files.photo);
            if(files.photo.size > 1000000){
                return res.status(400).json({
                    error: "Image should be less than 1 mb in size"
                });
            }
            product.photo.data = fs.readFileSync(files.photo.path);
            product.photo.contentType = files.photo.type;
        }
        //save product in database and send json response
        product.save((err, result) => {
            if(err) {
                return res.status(400).json({
                    error: errorHandler(err)
                });
            }
            res.json(result);
        });

    });
};


exports.remove = (req,res) => {
    let product = req.product;
    product.remove((err, deletedProduct) => {
        if(err){
            return res.status(400).json({
                error: errorHandler(err)
            });
        }
        res.json({
            "message" : "Product deleted successfully"
        });
    });
};

exports.update = (req,res) => {
    let form = new formidable.IncomingForm();
    form.keepExtensions = true;
    form.parse(req,(err, fields, files) => {
        if(err)
        {
            return res.status(400).json({
                error: "Image could not be uploaded"
            });
        }


        //check for all fields, make sure all fields are there
        const {name, description, price, category, quantity, shipping} = fields;
        if(!name || !description || !price || !category || !quantity || !shipping){
            return res.status(400).json({
                error: "All fields are required"
            });
        }
        let product = req.product;
        //1st parameter is product and other is fields to be updated
        product = _.extend(product, fields);

        if(files.photo){
            //file validation example restricting file size(here not more than 1 mb), here checking the photo coming from client side
            //console.log("FILES PHOTO: ", files.photo);
            if(files.photo.size > 1000000){
                return res.status(400).json({
                    error: "Image should be less than 1 mb in size"
                });
            }
            product.photo.data = fs.readFileSync(files.photo.path);
            product.photo.contentType = files.photo.type;
        }
        //save product in database and send json response
        product.save((err, result) => {
            if(err) {
                return res.status(400).json({
                    error: errorHandler(err)
                });
            }
            res.json(result);
        });

    });
};


//return products to our front end client
//we want to return product based on sell and arrival
//idea: show certain products based on sell, so if certain products have been sold more than the others
//we want to return these products to front end client, so that these products can be displayed as most popular products
//and some of the products which are new/just arrived then we can show newly added products as new arrivals to front end client
//1st we have to go to product model, add a sold field

//create a method that grabs the route parameters and based on that it will fetch products from database and return to frontend client
//1) if we want to return products by sell:  /products?sortBy=sold&order=desc&limit=4, example return 4 products on each request
//2) if we want to return products based on arrival:  /products?sortBy=createdAt&order=desc&limit=4
//all these query parameters come from frontend client
// if no params are send, then all products are returned, it is flexible

//if we get search query parameters based on that our method will work


//order= grabs order from route parameter
//1)if we get a query grab order based on that, otherwise by default do order ascending
//2)if we get sort by from request query then grab it, else sort based on id(default)
//3 if we query based on limit grab it else default limit is 6
exports.list = (req,res) => {
    let order = req.query.order ? req.query.order :'asc';
    let sortBy = req.query.sortBy ? req.query.sortBy :'_id';
    let limit = req.query.limit ? parseInt(req.query.limit) : 6;

    //pulling products from db based on query
    //1)we don't want to get everything and send as response, so we use select method, and we want to deselect "photo"
    //coz we are saving all the photos for each products in the db, in the binary data, size is big for each photo, 
    //so when we are returning all the products we do not want to send photo altogether, it is going to be very slow
    //so want we do is we display the product and we will make another request to fetch the photo of that product, 
    //2)then each product we want to populate category also, why we can do: (in category model) as category is type of mongoose object id and it refers to the category model
    //populate particular category associated with product,category name, updated at and all are available her
    //3) to sort we pass arry of array, sort based on sort by, order
    //4) limit- default 6
    Product.find()
            .select("-photo")
            .populate("category")
            .sort([[sortBy, order]])
            .limit(limit)
            .exec((err, products) => {
                if(err) {
                    return res.status(400).json({
                        error: "Products not found"
                    });
                }
                res.send(products);
            });

};