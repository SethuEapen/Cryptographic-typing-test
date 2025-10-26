const express = require('express');
const app = express();
const PORT = 8080;

app.use(express.json())
app.get('/randnum/:hops', (req, res) => {
    const { hops } = req.params
    res.status(200).send({
        seed: Math.random(),
        hops: hops
    });
});

app.listen(
    PORT, 
    () => console.log(`it's alive on http://localhost:${PORT}`)
)