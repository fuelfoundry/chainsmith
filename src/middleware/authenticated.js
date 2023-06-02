module.exports = (req, res, next) => {
    try {
        //check the token and if the user is authenticated or not.
        //throw errors when needed
        next()
    } catch {
        res.status(401).json({error: new Error('Invalid request')});
    }
}
