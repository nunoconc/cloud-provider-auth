const login = document.getElementById('bar_login');
const register = document.getElementById('bar_register');
const nameHTML = document.getElementById('user_name');
const emailHTML = document.getElementById('user_email');

const user = JSON.parse(localStorage.getItem('user'));

if (!user) {
    window.location.href = '/auth/login';

} else {
    if(nameHTML && emailHTML) {
        nameHTML.textContent = user.name;
        emailHTML.textContent = user.email;
    }
    login.hidden = true;
    register.hidden = true;
}
