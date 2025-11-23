module.exports = (err, req, res, next) => {
    console.error('Error:', err && err.message ? err.message : err);
    // friendly message for HTML pages
    if (req.accepts('html')) {
      // render simple error page or fallback to text
      return res.status(500).send('Server error');
    }
    res.status(500).json({ error: 'Server error' });
  };
  