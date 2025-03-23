import express from 'express';

import {
    generateAuthenticationOptions,
    generateRegistrationOptions, verifyAuthenticationResponse, verifyRegistrationResponse,
} from '@simplewebauthn/server';

const router = express.Router();
import {Low} from 'lowdb';
import {JSONFile} from 'lowdb/node';
import bcrypt from 'bcryptjs';
import {jwtDecode} from "jwt-js-decode";
import base64url from "base64url";

const file = new JSONFile('db.json');
const db = new Low(file, {users: []});
const rpID = 'localhost'; // relaying party identifier
const expectedOrigin = `http://${rpID}:3000`;

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

router.post('/auth-options', async function (req, res) {
    // Read data from JSON file, this will set db.data content
    await db.read();

    const foundUser = db.data.users.find(u => u.email === req.body.email);
    if (foundUser) {
        res.send({
            password: foundUser.password !== false,
            google: foundUser.federated && foundUser.federated.google,
            webauthn: foundUser.webauthn,
        });
    } else {
        res.send({
            password: true,
        });
    }
})

router.post("/webauthn-login-options", async (req, res) => {
    // Read data from JSON file, this will set db.data content
    await db.read();

    const user = db.data.users.find(u => u.email === req.body.email);

    //if (user === null) {
    //    res.sendStatus(404);
    //    return;
    //}

    const options = {
        timeout: 60000,
        allowCredentials: [],
        devices: user && user.devices ? user.devices.map(dev => ({
            id: dev.credentialID,
            type: 'public-key',
            transports: dev.transports,
        })) : [],
        userVerification: 'required',
        rpID,
    };

    const loginOpts = await generateAuthenticationOptions(options);

    if (user) {
        user.currentChallenge = loginOpts.challenge;
    }

    res.send(loginOpts);
});

router.post("/webauthn-login-verification", async (req, res) => {
    // Read data from JSON file, this will set db.data content
    await db.read();

    const data = req.body.data;

    const user = db.data.users.find(u => u.email === req.body.email);

    if (user == null) {
        res.sendStatus(400).send({ok: false});
        return;
    }

    const expectedChallenge = user.currentChallenge;

    let dbAuthenticator;
    const bodyCredIDBuffer = base64url.toBuffer(data.rawId);

    for (const dev of user.devices) {
        const currentCredential = new Buffer(dev.credentialID.data);
        if (bodyCredIDBuffer.equals(currentCredential)) {
            dbAuthenticator = dev;
            break;
        }
    }

    if (!dbAuthenticator) {
        return res.status(400).send({ok: false, message: 'Authenticator is not registered with this site'});
    }

    let verification;
    try {
        const options = {
            credential: data,
            expectedChallenge: `${expectedChallenge}`,
            expectedOrigin,
            expectedRPID: rpID,
            authenticator: {
                ...dbAuthenticator,
                credentialPublicKey: new Buffer(dbAuthenticator.credentialPublicKey.data) // Re-convert to Buffer from JSON
            },
            requireUserVerification: true,
        };
        verification = await verifyAuthenticationResponse(options);
    } catch (error) {
        return res.status(400).send({ok: false, message: error.toString()});
    }

    const {verified, authenticationInfo} = verification;

    if (verified) {
        dbAuthenticator.counter = authenticationInfo.newCounter;
    }

    res.send({
        ok: true,
        user: {
            name: user.name,
            email: user.email
        }
    });
});

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

router.post("/webauthn-registration-options", async (req, res) => {
    // Read data from JSON file, this will set db.data content
    await db.read();

    const user = db.data.users.find(u => u.email === req.body.email);

    const options = {
        rpName: 'cloud-provider-auth',
        rpID,
        userName: user.email,
        timeout: 60000,
        attestationType: 'none',

        /**
         * Passing in a user's list of already-registered authenticator IDs here prevents users from
         * registering the same device multiple times. The authenticator will simply throw an error in
         * the browser if it's asked to perform registration when one of these ID's already resides
         * on it.
         */
        excludeCredentials: user.devices ? user.devices.map(dev => ({
            id: dev.credentialID,
            type: 'public-key',
            transports: dev.transports,
        })) : [],

        authenticatorSelection: {
            userVerification: 'required',
            residentKey: 'required',
        },
        /**
         * The two most common algorithms: ES256, and RS256
         */
        supportedAlgorithmIDs: [-7, -257],
    };

    /**
     * The server needs to temporarily remember this value for verification, so don't lose it until
     * after you verify an authenticator response.
     */
    const regOptions = await generateRegistrationOptions(options)
    user.currentChallenge = regOptions.challenge;
    await db.write();

    res.send(regOptions);
});

router.post("/webauthn-registration-verification", async (req, res) => {
    // Read data from JSON file, this will set db.data content
    await db.read();

    const user = db.data.users.find(u => u.email === req.body.email);
    const data = req.body.data;

    const expectedChallenge = user.currentChallenge;

    let verification;
    try {
        const options = {
            response: data,
            expectedChallenge: `${expectedChallenge}`,
            expectedOrigin,
            expectedRPID: rpID,
            requireUserVerification: true,
        };
        verification = await verifyRegistrationResponse(options);
    } catch (error) {
        console.log(error);
        return res.status(400).send({error: error.toString()});
    }

    const {verified, registrationInfo} = verification;

    if (verified && registrationInfo) {
        const {credentialPublicKey, credentialID, counter} = registrationInfo;

        const existingDevice = user.devices ? user.devices.find(
            device => new Buffer(device.credentialID.data).equals(credentialID)
        ) : false;

        if (!existingDevice) {
            const newDevice = {
                credentialPublicKey,
                credentialID,
                counter,
                transports: data.response.transports,
            };
            if (user.devices === undefined) {
                user.devices = [];
            }
            user.webauthn = true;
            user.devices.push(newDevice);
            await db.write();
        }
    }

    res.send({ok: true});

});
export default router;
