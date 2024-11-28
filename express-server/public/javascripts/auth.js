const API = {
    endpoint: '/auth/',
    login: async (user) => {
        return await API.makePost('login', user);
    },
    register: async (user) => {
        return await API.makePost('register', user);
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

        Auth.postLogin(response, {name, email, ...response});

    },
    postLogin: async (response, user) => {
        if (!response.ok) {
            alert(response.message);
            return;
        }

        localStorage.setItem('user', JSON.stringify(user));
        window.location.href = '/user';
    },
}
