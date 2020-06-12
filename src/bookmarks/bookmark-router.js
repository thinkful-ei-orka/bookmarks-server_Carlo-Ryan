'use strict';
const express = require('express')
const logger = require('../logger')
const xss = require('xss')
const BookmarksService = require('../bookmarks/bookmarks-service')

const bookmarkRouter = express.Router();
const bodyParser = express.json();

bookmarkRouter
  .route('/bookmarks')
  .get((req, res) => {
    const knexInstance = req.app.get('db')
    BookmarksService.getAllBookmarks(knexInstance)
      .then(bookmarks => {
        res
          .status(200)
          .json(bookmarks);
      })
  })
  .post(bodyParser, (req, res) => {
    const knexInstance = req.app.get('db')
    const { title, url, description, rating } = req.body;
    const testBookmark = { title, url, description, rating };


    for (const [key, value] of Object.entries(testBookmark)) {
      if (value == null) {
        return res.status(400).json({
          error: { message: `Missing '${key}' in request body` }
        })
      }
    }

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
    if (rating < 1 || rating > 5) {
      logger.error('Rating is not valid');
      return res.status(400).send('Rating must be a number 1-5')
    }

    const newBookmark = {
      title,
      description,
      url,
      rating,
    };

    // bookmarks.push(newBookmark);

    BookmarksService.insertBookmark(knexInstance, newBookmark)
      .then(bookmark => {
        res
          .status(201)
          .location(`/api/bookmarks/${bookmark.id}`)
          .json({
            id: bookmark.id,
            title: xss(bookmark.title),
            description: xss(bookmark.description),
            url: bookmark.url,
            rating: bookmark.rating
          });
      })

  });

bookmarkRouter
  .route('/bookmarks/:id')
  .all((req, res, next) => {
    BookmarksService.getById(
      req.app.get('db'),
      req.params.id
    )
      .then(bookmark => {
        if (!bookmark) {
          logger.error('Error, bookmark not found');
          return res.status(404).json({
            error: { message: `Bookmark doesn't exist` }
          })
        }
        res.bookmark = bookmark
        next()
      })
      .catch(next)
  })
  .get((req, res) => {
    res
      .status(200)
      .json({
        id: res.bookmark.id,
        title: xss(res.bookmark.title),
        url: res.bookmark.url,
        description: xss(res.bookmark.description),
        rating: res.bookmark.rating
      })
      .send('Bookmark successfully sent!');
  })
  .delete((req, res, next) => {
    BookmarksService.deleteBookmark(
      req.app.get('db'),
      req.params.id
    )
      .then(() => {
        logger.info(`ID: ${req.params.id} was deleted`);
        res.status(204).end()
      })
      .catch(next)
  })
  .patch(bodyParser, (req, res, next) => {
    const { title, url, description, rating } = req.body
    const bookmarkToUpdate = { title, url, description, rating }
    const numberOfValues = Object.values(bookmarkToUpdate).filter(Boolean).length

    console.log(bookmarkToUpdate);

    if (numberOfValues === 0) {
      return res.status(400).json({
        error: {
          message: `Request body must contain either 'title', 'url', 'description', or rating`
        }
      })
    }

    BookmarksService.updateBookmark(
      req.app.get('db'),
      req.params.id,
      bookmarkToUpdate
    )
    .then(rows => {
      res.status(204).end()
    })
    .catch(next)
  })

module.exports = bookmarkRouter;
