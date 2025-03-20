const API = {
    endpoint: '/auth/',
    login: async (user) => {
        return await API.makePost('login', user);
    },
    register: async (user) => {
        return await API.makePost('register', user);
    },
    loginFromGoogle: async (data) => {
        return await API.makePost('login-google', data);
    },
    makePost: async (action, user) => {
        const response = await fetch(API.endpoint + action, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(user)
        });
        return response.json();
    }
}

const Auth = {
    login: async (event) => {
        event.preventDefault();

        const email = document.getElementById('login_email').value;
        const password = document.getElementById('login_password').value;

        const response = await API.login({ email, password });


        Auth.postLogin(response, {email, ...response});
    },
    register: async (event) => {
        event.preventDefault();

        const name = document.getElementById('register_name').value;
        const email = document.getElementById('register_email').value;
        const password = document.getElementById('register_password').value;

        const response = await API.register({ name, email, password });

        Auth.postLogin(response, {name, email, password, ...response});

    },
    postLogin: async (response, user) => {
        if (!response.ok) {
            alert(response.message);
            return;
        }

        localStorage.setItem('user', JSON.stringify(user));

        if(window.PasswordCredential && user.password) {
            const credentials = new window.PasswordCredential({
                id: user.email,
                password: user.password,
                user: user.name
            });

            try {
                navigator.credentials.store(credentials);
            } catch (e) {
                console.error("Error storing credentials:", e);
            }
        }

        window.location.href = '/user';
    },
    logout: () => {
        localStorage.removeItem('user');
        if(window.PasswordCredential) {
            navigator.credentials.preventSilentAccess();
        }
        window.location.href = '/';
    },
    autoLogin: async () => {
        if(window.PasswordCredential) {
            const credentials = await navigator.credentials.get({password: true});
            console.log("Stored credentials:", credentials);
        }
    },
    loginFromGoogle: async (data) => {
        const response = await API.loginFromGoogle(data);
        Auth.postLogin(response, {
            name: response.name,
            email: response.email,
        });
    },
    validate: ()=> {
        const login = document.getElementById('bar_login');
        const register = document.getElementById('bar_register');
        const logout = document.getElementById('bar_logout');
        const nameHTML = document.getElementById('user_name');
        const emailHTML = document.getElementById('user_email');

        const user = JSON.parse(localStorage.getItem('user'));

        if (!user) {
            if(window.location.href.endsWith('/user')) {
                window.location.href = '/auth/login';
            }
            logout.hidden = true;
        } else {
            if(nameHTML && emailHTML) {
                nameHTML.textContent = user.name;
                emailHTML.textContent = user.email;
            }
            login.hidden = true;
            register.hidden = true;
        }
    }
}

Auth.autoLogin();
