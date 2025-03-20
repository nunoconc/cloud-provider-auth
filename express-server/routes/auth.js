import express from 'express';

const router = express.Router();
import {Low} from 'lowdb';
import {JSONFile} from 'lowdb/node';
import bcrypt from 'bcryptjs';
import {jwtDecode} from "jwt-js-decode";

const file = new JSONFile('db.json');
const db = new Low(file, {users: []});

router.get('/login', function (req, res) {
    res.render('login', {title: 'Login Page'});
})

router.get('/register', function (req, res) {
    res.render('register', {title: 'Register Page'});
})


router.post('/login', async function (req, res) {
    //Todo - validate user data

    // get user data from request
    const email = req.body.email;
    const password = req.body.password;

    // Read data from JSON file, this will set db.data content
    await db.read();

    // Set default data if JSON file is empty
    db.data ||= {users: []};

    // search for user in database
    const userFound = db.data.users.find(user => user.email === email);

    if (userFound) {
        // check password
        if (bcrypt.compareSync(password, userFound.password)) {
            res.send({ok: true, name: userFound.name, email: userFound.email});
        } else {
            res.send({ok: false, message: "Incorrect credentials."});
        }
    } else {
        res.send({ok: false, message: "Incorrect credentials."});
    }
})

router.post('/login-google', async function (req, res) {
    const jwt = jwtDecode(req.body.credential);
    const user = {
        email: jwt.payload.email,
        name: jwt.payload.given_name + ' ' + jwt.payload.family_name,
        password: false,
    }

    // Read data from JSON file, this will set db.data content
    await db.read();

    const userFound = db.data.users.find(u => u.email === user.email);

    if (userFound) {
        userFound.federated = {
            google: jwt.payload.aud
        }

    } else {
        db.data.users.push({
            ...user,
            federated: {
                google: jwt.payload.aud
            },
        });
    }

    await db.write();
    res.send({ok: true, name: user.name, email: user.email});
})


router.post('/register', async function (req, res) {
    const salt = bcrypt.genSaltSync(10);
    const hashedPass = bcrypt.hashSync(req.body.password, salt);

    // Todo - validate user data

    // get user data from request
    const user = {
        name: req.body.name,
        email: req.body.email,
        password: hashedPass
    }

    // Read data from JSON file, this will set db.data content
    await db.read();

    // Set default data if JSON file is empty
    db.data ||= {users: []};

    // search for user in database
    const userFound = db.data.users.find(u => u.email === user.email);

    if (userFound) {
        // user already exists
        res.send({ok: false, message: "User already exists."});
    } else {
        // update database with new user
        db.data.users.push(user);
        await db.write();
        res.send({ok: true, message: "User created.", name: user.name, email: user.email});
    }
})

export default router;
