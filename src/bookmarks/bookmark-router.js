const express = require('express')
const { v4: uuid } = require('uuid');
const logger = require('../logger')
const { bookmarks } = require('../store')

const bookmarkRouter = express.Router();
const bodyParser = express.json();

bookmarkRouter
    .route('/bookmarks')
    .get((req, res) => {
        res.json(bookmarks)
    })
    .post(bodyParser, (req, res) => {

    })

bookmarkRouter
    .route('/bookmarks/:id')
    .get((req, res) => {
        const { id } = req.params;
        const bookmark = bookmarks.find(bookmark => bookmark.id === id);

        if(!bookmark) {
            logger.error(`Bookmark is not valid at id: ${id}`)
            return res
                .status(404)
                .send('Bookmark not found');
        }

        res
            .status(200)
            .json(bookmark)
            .send('Bookmark successfully sent!')
    })
    .delete((req, res) => {

    })


module.exports = bookmarkRouter;