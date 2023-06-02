const get = (req, res) => {

    if (req.session.loggedin) {

        res.render('portal.html', {username: req.session.username});
    } else {

        res.redirect('/');
    }
}

module.exports = { get };

