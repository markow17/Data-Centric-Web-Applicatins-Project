//Data Centric Web Applications Project
//G00390942 Marko Stojanovic
const express = require('express')
const bodyParser = require('body-parser')
const mongoose = require('mongoose');
const cors = require('cors');
const mysql = require('promise-mysql');
const { check, validationResult } = require('express-validator');

const app = express();
const port = 3000;

//creating pool
var pool;

mysql.createPool({
    connectionLimit: 5,
    user: 'root',
    host: 'localhost',
    port: 3306,
    password: '',
    database: 'proj2022'
}).then(p =>
{
    pool = p
}).catch(e =>
{
    console.log("pool error:" + e)
});

app.set('view engine', 'ejs')

app.use(bodyParser.urlencoded({ extended: false}))

app.use(bodyParser.json())

app.use(cors());

//connecting to mongodb
const mongodbUri = 'mongodb+srv://marko:SjytQhc43yZw90N8@cluster0.codqbla.mongodb.net/?retryWrites=true&w=majority';
mongoose.connect(mongodbUri, { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;

//connecting to the employee database
let employeesDB = db.useDb("employeesDB")

//creating a schema
const employeeSchema = new mongoose.Schema({
    _id: String,
    phone: String,
    email: String,
});

//creating the model
const EmployeeModel = employeesDB.model("employees", employeeSchema);

app.listen(port, () =>
{
    console.log(`Example app listening on http://localhost:${port}`)
})

//home page
app.get('/', (req, res) =>
{
    res.render("home", { errors: "undefined" })
})

//employees page
app.get('/employees', (req, res) =>
{
    pool.query("select * from employee").then((d) =>
    {
        res.render("employees", { employees: d })
    }).catch((e) =>
    {
        res.redirect("/")
    })
});

//editing page
app.get('/employees/edit/:eid',
    (req, res) =>
    {
        pool.query("SELECT * FROM employee WHERE eid = '" + req.params.eid + "'").then((d) =>
        {
            res.render("employee", { employee: d[0], errors: undefined })
        }).catch((e) =>
        {
            res.redirect("/employees")
        })
    }
);


app.post('/employees/edit/:eid',
    [
        check("ename").isLength({ min: 5 }).withMessage("Name must be 5 characters long")
    ],
    [
        check("role").isIn(["Manager", "Employee"]).withMessage("Please select valid Role")
    ],
    [
        check("salary").isFloat({ gt: 0 }).withMessage("Salary must be greater than 0")
    ],
    (req, res) =>
    {
        const errors = validationResult(req)

        let data = {};
        data.eid = req.params.eid;
        data.name = req.body.name;
        data.role = req.body.role;
        data.salary = req.body.salary;

        if (!errors.isEmpty())
        {
            res.render("employee", { employee: data, errors: errors.errors })
        }
        else
        {
            pool.query(`UPDATE employee SET ename='${req.body.ename}', role='${req.body.role}', salary='${req.body.salary}' WHERE eid = '${req.params.eid}'`).then((d) =>
            {
                res.redirect("/employees")
            }).catch((e) =>
            {
                res.redirect("/employees")
            })
        }
    }
);

//deptartments page
app.get('/depts', (req, res) =>
{
    pool.query("SELECT dept.did,dept.dname,loc.county,dept.budget FROM dept JOIN location AS loc ON loc.lid = dept.lid").then((d) =>
    {
        res.render("depts", { depts: d })
    }).catch((e) =>
    {
        res.redirect("/");
    })
});


app.get('/depts/delete/:did', (req, res) =>
{
    pool.query(`DELETE FROM dept WHERE did = '${req.params.did}';`).then((d) =>
    {
        res.redirect("/departments")
    }).catch(() =>
    {
        res.status(400).send(
            `<div style="text-align:center;">
                <h1>Error Message</h1>
                <h2>${req.params.did} has Employees and connot be deleted</h2>
                <a href="/">Home</a>
            </div>`)
    })
});

//employees mongodb page
app.get('/employeesMongoDB', async (req, res) =>
{
    let result = await EmployeeModel.find({})
    console.log(result);
    res.render("MongoDB/employeesMongoDB", { employees: result });
    
});

//adding employee mongodb page
app.get('/employeesMongoDB/addEmployee', async (req, res) =>
{
    res.render("MongoDB/addEmployee", { errors: undefined });
});

//adding employee
app.post('/employeesMongoDB/addEmployee',
    [
        check("_id").isLength({ eq: 4 }).withMessage("Name must be 5 characters long")
    ],
    [
        check("phone").isLength({ gt: 5 }).withMessage("Phone number must be > 5")
    ],
    [
        check("email").isEmail().withMessage("Email not correctly formated")
    ],
    async (req, res) =>
    {
        const errors = validationResult(req)

        if (!errors.isEmpty())
        {
            res.render("MongoDB/addEmployee", { errors: errors.errors })
            return;
        }
        else {
            try
        {
            let data = {};
            data._id = req.body._id;
            data.phone = req.body.phone;
            data.email = req.body.email;

            await EmployeeModel.insertMany([data])
        }
        catch (error)
        {
            res.status(400).send(
                `<div style="text-align:center;">
                    <h1>Error Message</h1>
                    <h2>Error: ${req.body._id} already exists in MongoDB</h2>
                    <a href="/employeesMongoDB">Home</a>
                </div>`
            );

            return;
        }

        let sqlEmployees = await pool.query(`SELECT * FROM employee WHERE eid = '${req.body._id}'`)

        if (sqlEmployees.length == 0)
        {
            res.status(400).send(
                `<div style="text-align:center;">
                    <h1>Error Message</h1>
                    <h2>Error: ${req.body._id} doesnt exist in mysqldb</h2>
                    <a href="/employeesMongoDB">Home</a>
                </div>`
                );
                return;
        }

        console.log("test", sqlEmployees);

        res.redirect("/employeesMongoDB")
        }
        
    }
);