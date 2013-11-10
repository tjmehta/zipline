var id = require('./id');

module.exports = function (app) {
  app.set('views', __dirname + '/../views');

  app.get('/', function (req, res) {
    res.redirect('/' + id.generate());
  });

  app.get('/:shareId', function (req, res) {
    res.render('share', {
      shareId: req.params.shareId
    });
  });
}