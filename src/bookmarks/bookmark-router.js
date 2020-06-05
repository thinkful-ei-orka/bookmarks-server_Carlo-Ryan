'use strict';
const express = require('express');
const { v4: uuid } = require('uuid');
const logger = require('../logger');
const { bookmarks } = require('../store');

const bookmarkRouter = express.Router();
const bodyParser = express.json();

bookmarkRouter
  .route('/bookmarks')
  .get((req, res) => {
    res.status(200).json(bookmarks);
  })
  .post(bodyParser, (req, res) => {
    const { title, description, url, rating } = req.body;

    let regexp = /^https:\/\//;

    if (!regexp.test(url) || url.length <= 8) {
      logger.error(`URL must begin with 'https://'`);
      return res.status(400).send(`URL must begin with https://`);
    }
    if (!title || !description || !url || !rating) {
      logger.error('Missing expected parameters');
      return res.status(400).send('Missing data');
    }
    if (isNaN(rating)) {
      logger.error('Rating is not a number');
      return res.status(400).send('Rating must be a number');
    }
    const id = uuid();
    const newBookmark = {
      id,
      title,
      description,
      url,
      rating,
    };
    bookmarks.push(newBookmark);
    res
      .status(201)
      .location(`http://localhost:8000/bookmark/${id}`)
      .json(newBookmark);
  });

bookmarkRouter
  .route('/bookmarks/:id')
  .get((req, res) => {
    const { id } = req.params;
    const bookmark = bookmarks.find((bookmark) => bookmark.id === id);

    if (!bookmark) {
      logger.error(`Bookmark is not valid at id: ${id}`);
      return res.status(404).send('Bookmark not found');
    }

    res.status(200).json(bookmark).send('Bookmark successfully sent!');
  })
  .delete((req, res) => {
    const { id } = req.params;
    const bookmarkIndex = bookmarks.findIndex((bookmark) => bookmark.id === id);
    if (bookmarkIndex === -1) {
      logger.error('Error, bookmark not found');
      return res.status(404).send('Not Found');
    }
    bookmarks.splice(bookmarkIndex, 1);
    logger.info(`ID: ${id} was deleted`);
    res.status(204).end();
  });

module.exports = bookmarkRouter;
