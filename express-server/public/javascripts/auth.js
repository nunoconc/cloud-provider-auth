const API = {
    endpoint: '/auth/', checkAuthOptions: async (user) => {
        return await API.makePost('auth-options', user);
    }, login: async (user) => {
        return await API.makePost('login', user);
    }, register: async (user) => {
        return await API.makePost('register', user);
    }, loginFromGoogle: async (data) => {
        return await API.makePost('login-google', data);
    }, webAuthn: {
        loginOptions: async (email) => {
            return await API.makePost('webauthn-login-options', {email});
        }, loginVerification: async (email, data) => {
            return await API.makePost('webauthn-login-verification', {
                email, data
            });
        }, registrationOptions: async (email) => {
            return await API.makePost('webauthn-registration-options', {email});
        }, registrationVerification: async (email, data) => {
            return await API.makePost('webauthn-registration-verification', {
                email, data
            });
        }
    }, makePost: async (action, data) => {
        const response = await fetch(API.endpoint + action, {
            method: 'POST', headers: {
                'Content-Type': 'application/json'
            }, body: JSON.stringify(data)
        });
        return response.json();
    },
}

const Auth = {
    checkAuthOptions: async () => {
        const response = await API.checkAuthOptions({
            email: document.getElementById("login_email").value,
        });

        Auth.loginStep = 2;

        if (response.password) {
            document.getElementById("login_section_password").hidden = false;
        }

        if (response.webauthn) {
            document.getElementById("login_section_webauthn").hidden = false;
        }
    }, login: async (event) => {
        if (event) event.preventDefault();

        if (Auth.loginStep === 1) {
            Auth.checkAuthOptions();
        } else {
            // Step 2, normal login
            const email = document.getElementById('login_email').value;
            const password = document.getElementById('login_password').value;

            const response = await API.login({email, password});


            Auth.postLogin(response, {email, ...response});
        }
    }, register: async (event) => {
        event.preventDefault();

        const name = document.getElementById('register_name').value;
        const email = document.getElementById('register_email').value;
        const password = document.getElementById('register_password').value;

        const response = await API.register({name, email, password});

        await Auth.postLogin(response, {name, email, password, ...response});

    }, postLogin: async (response, user) => {
        if (!response.ok) {
            alert(response.message);
            return;
        }

        localStorage.setItem('user', JSON.stringify(user));

        if (window.PasswordCredential && user.password) {
            const credentials = new window.PasswordCredential({
                id: user.email, password: user.password, user: user.name
            });

            try {
                await navigator.credentials.store(credentials);
            } catch (e) {
                console.error("Error storing credentials:", e);
            }
        }

        window.location.href = '/user';
    }, logout: () => {
        localStorage.removeItem('user');
        if (window.PasswordCredential) {
            navigator.credentials.preventSilentAccess();
        }
        window.location.href = '/';
    }, autoLogin: async () => {
        if (window.PasswordCredential) {
            const credentials = await navigator.credentials.get({password: true});
            console.log("Stored credentials:", credentials);

            // If have credentials try to login
            if (credentials) {
                document.getElementById('login_email').value = credentials.id;
                document.getElementById('login_password').value = credentials.password;
                Auth.login();
            }
        }
    }, loginFromGoogle: async (data) => {
        const response = await API.loginFromGoogle(data);
        Auth.postLogin(response, {
            name: response.name, email: response.email,
        });
    }, addWebAuthn: async () => {
        const email = JSON.parse(localStorage.getItem('user')).email;

        const options = await API.webAuthn.registrationOptions(email);
        options.authenticatorSelection.residentKey = 'required';
        options.authenticatorSelection.requireResidentKey = true;
        options.extensions = {
            credProps: true,
        };

        const authRes = await SimpleWebAuthnBrowser.startRegistration(options);
        const verificationRes = await API.webAuthn.registrationVerification(email, authRes);

        if (verificationRes.ok) {
            alert("You can now login using the registered method!");
        } else {
            alert(verificationRes.message)
        }
    }, webAuthnLogin: async () => {
        const email = document.getElementById("login_email").value;

        const options = await API.webAuthn.loginOptions(email);
        const loginRes = await SimpleWebAuthnBrowser.startAuthentication(options);
        const verificationRes = await API.webAuthn.loginVerification(email, loginRes);

        if (verificationRes) {
            await Auth.postLogin(verificationRes, verificationRes.user);
        } else {
            alert(verificationRes.message)
        }
    }, validate: () => {
        const login = document.getElementById('bar_login');
        const register = document.getElementById('bar_register');
        const logout = document.getElementById('bar_logout');
        const nameHTML = document.getElementById('user_name');
        const emailHTML = document.getElementById('user_email');

        const user = JSON.parse(localStorage.getItem('user'));

        if (!user) {
            if (window.location.href.endsWith('/user')) {
                window.location.href = '/auth/login';
            }
            logout.hidden = true;
        } else {
            if (nameHTML && emailHTML) {
                nameHTML.textContent = user.name;
                emailHTML.textContent = user.email;
            }
            login.hidden = true;
            register.hidden = true;
        }
    }, loginStep: 1, init: () => {
        document.getElementById('login_section_password').hidden = true;
        document.getElementById('login_section_webauthn').hidden = true;

    }
}
