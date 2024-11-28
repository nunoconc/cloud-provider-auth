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

        if (response.ok) {
            alert(`Welcome ${response.name}`);
        } else {
            alert(response.message);
        }
    },
    register: async (event) => {
        event.preventDefault();

        const name = document.getElementById('register_name').value;
        const email = document.getElementById('register_email').value;
        const password = document.getElementById('register_password').value;

        const response = await API.register({ name, email, password });

        if (response.ok) {
            alert(`Welcome ${response.name}, with email: ${response.email}`);
        } else {
            alert(response.message);
        }
    }
}
