const { expect } = require('chai')
const knex = require('knex')
const app = require('../src/app')
const supertest = require('supertest')
const { makeBookmarksArray } = require('./bookmarks.fixtures')
const bookmarkRouter = require('../src/bookmarks/bookmark-router')

const token = '$2a$10$ra1z0n2XnSnbMP/ipTMHeOqqrI7i8Rssm/z8MHTxgb7LamV7LpfXu';

describe.only('Bookmarks Endpoints', () => {
    let db

    before('Create knex instance', () => {
        db = knex({
            client: 'pg',
            connection: process.env.TEST_DB_URL,
        })
        app.set('db', db)
    })

    after('Disconnect from db', () => db.destroy())
    before('Clean the table', () => db('bookmarks').truncate())
    afterEach('Cleanup', () => db('bookmarks').truncate())

    describe('GET /api/bookmarks', () => {
        context('Given there are bookmarks in the database', () => {
            const testBookmarks = makeBookmarksArray()

            beforeEach('insert bookmarks', () => {
                return db
                    .into('bookmarks')
                    .insert(testBookmarks)
            })

            it('Responds with 200 and all of the bookmarks', () => {
                return supertest(app)
                    .get('/api/bookmarks')
                    .set('Authorization', 'bearer ' + token)
                    .expect(200, testBookmarks)
            })
        })

        context('Given no bookmarks', () => {
            it('Responds with 200 and an empty list', () => {
                return supertest(app)
                    .get('/api/bookmarks')
                    .set('Authorization', 'bearer ' + token)
                    .expect(200, [])
            })
        })
    })

    describe(`GET /api/bookmarks/:bookmark_id`, () => {
        context('Given there are no bookmarks in the database', () => {
            it('Responds with a 404', () => {
                const bookmarkId = 123456
                return supertest(app)
                    .get(`/api/bookmarks/${bookmarkId}`)
                    .set('Authorization', 'bearer ' + token)
                    .expect(404, { error: { message: `Bookmark doesn't exist` } })
            })
        })

        context('Given there are bookmarks in the database', () => {
            const testBookmarks = makeBookmarksArray()

            beforeEach('Insert bookmarks', () => {
                return db
                    .into('bookmarks')
                    .insert(testBookmarks)
            })

            it('Responds with 200 and the specified bookmark', () => {
                const bookmarkId = 2
                const expectedBookmark = testBookmarks[bookmarkId - 1]
                return supertest(app)
                    .get(`/api/bookmarks/${bookmarkId}`)
                    .set('Authorization', 'bearer ' + token)
                    .expect(200, expectedBookmark)
            })

            context(`Given an XSS attack bookmark`, () => {
                const maliciousBookmark = {
                    id: 911,
                    title: 'Naughty naughty very naughty <script>alert("xss");</script>',
                    url: 'https://www.google.com',
                    description: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`,
                    rating: 5
                }

                beforeEach(`insert malicious bookmark`, () => {
                    return db
                        .into('bookmarks')
                        .insert([maliciousBookmark])
                })

                it('Removes XSS attack content', () => {
                    return supertest(app)
                        .get(`/api/bookmarks/${maliciousBookmark.id}`)
                        .set('Authorization', 'bearer ' + token)
                        .expect(200)
                        .expect(res => {
                            expect(res.body.title).to.eql('Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;')
                            expect(res.body.description).to.eql(`Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`)
                        })
                })
            })
        })
    })

    describe('POST /api/bookmarks', () => {
        it('Should return 201 with new bookmark added', () => {
            const newBookmark = {
                title: 'Cool Title',
                url: 'https://www.yahoo.com',
                description: 'not that cool',
                rating: 5
            }

            return supertest(app)
                .post('/api/bookmarks')
                .send(newBookmark)
                .set('Authorization', 'bearer ' + token)
                .expect(201)
                .expect(res => {
                    expect(res.body).to.be.an('object');
                    expect(res.body.title).to.eql(newBookmark.title);
                    expect(res.body.url).to.eql(newBookmark.url);
                    expect(res.body.description).to.eql(newBookmark.description);
                    expect(res.body.rating).to.eql(newBookmark.rating);
                    expect(res.headers.location).to.eql(`/api/bookmarks/${res.body.id}`)
                })
                .then(res => {
                    return db('bookmarks')
                        .select()
                        .where({ id: res.body.id })
                        .first()
                        .then(bookmark => expect(bookmark).to.exist);
                })
        })

        const requiredFields = ['title', 'url', 'description', 'rating']

        requiredFields.forEach(field => {
            const newBookmark = {
                title: 'Test Title',
                url: 'https://www.test.com',
                description: 'Test description',
                rating: 5
            }

            it(`Responds with 400 and an error message when the '${field}' is missing`, () => {
                delete newBookmark[field]
                console.log(newBookmark)

                return supertest(app)
                    .post('/api/bookmarks')
                    .set('Authorization', 'bearer ' + token)
                    .send(newBookmark)
                    .expect(400, {
                        error: { message: `Missing '${field}' in request body` }
                    })

            })
        })



        const invalidFields = ['url', 'rating']

        invalidFields.forEach(field => {
            const invalidBookmark = {
                title: 'Test Title',
                url: 'invalid',
                description: 'Test description',
                rating: 7
            }


            it(`Responds with 400 when ${field} is invalid`, () => {
                return supertest(app)
                    .post('/api/bookmarks')
                    .set('Authorization', 'bearer ' + token)
                    .send(invalidBookmark)
                    .expect(400)
            })
        })
    })

    describe('DELETE /api/bookmarks/:bookmark_id', () => {
        context('Given no bookmarks', () => {
            it('Responds with 404', () => {
                const bookmarkId = 123456
                return supertest(app)
                    .delete(`/api/bookmarks/${bookmarkId}`)
                    .set('Authorization', 'bearer ' + token)
                    .expect(404, { error: { message: `Bookmark doesn't exist` } })
            })
        })

        context('Given there are bookmarks in the database', () => {
            const testBookmarks = makeBookmarksArray()

            beforeEach('insert bookmarks', () => {
                return db
                    .into('bookmarks')
                    .insert(testBookmarks)
            })

            it('Responds with 204 and removes article', () => {
                const idToDelete = 2
                const expectedBookmarks = testBookmarks.filter(bookmark => bookmark.id !== idToDelete)

                return supertest(app)
                    .delete(`/api/bookmarks/${idToDelete}`)
                    .set('Authorization', 'bearer ' + token)
                    .expect(204)
                    .then(res => {
                        supertest(app)
                            .get(`/api/bookmarks`)
                            .expect(expectedBookmarks)
                    })
            })
        })
    })

    describe(`PATCH /api/bookmarks/:bookmark_id`, () => {
        context(`Given no bookmarks`, () => {
            it('Responds with 404', () => {
                const bookmarkId = 123456
                return supertest(app)
                    .patch(`/api/bookmarks/${bookmarkId}`)
                    .set('Authorization', 'bearer ' + token)
                    .expect(404, { error: { message: `Bookmark doesn't exist` } })
            })
        })

        context(`Given there are bookmarks in the database`, () => {
            const testBookmarks = makeBookmarksArray()

            beforeEach(`insert bookmarks`, () => {
                return db
                    .into('bookmarks')
                    .insert(testBookmarks)
            })

            it('Responds with 204 and updates bookmark', () => {
                const idToUpdate = 2
                const updateBookmark = {
                    title: 'Update Test Title',
                    url: 'https://www.test.com',
                    description: 'Update Test Description',
                    rating: 5
                }

                const expectedBookmark = Object.assign(testBookmarks[idToUpdate - 1], updateBookmark)

                return supertest(app)
                    .patch(`/api/bookmarks/${idToUpdate}`)
                    .set('Authorization', 'bearer ' + token)
                    .send(updateBookmark)
                    .send(204)
                    .then(res => {
                        supertest(app)
                            .get(`/api/bookmarks/${idToUpdate}`)
                            .expect(expectedBookmark)
                    })
            })
            it('Responds with 400 when no required fields are supplied', () => {
                const idToUpdate = 2
                return supertest(app)
                    .patch(`/api/bookmarks/${idToUpdate}`)
                    .set('Authorization', 'bearer ' + token)
                    .send({ dummyField: 'dummy' })
                    .expect(400, {
                        error: {
                            message: `Request body must contain either 'title', 'url', 'description', or rating`
                        }
                    })
            })
            it('Responds with 204 when updating only a subset of fields', () => {
                const idToUpdate = 2
                const updateBookmark = {
                    title: 'Updated title'
                }
                const expectedBookmark = Object.assign(testBookmarks[idToUpdate - 1], updateBookmark)

                return supertest(app)
                    .patch(`/api/bookmarks/${idToUpdate}`)
                    .set('Authorization', 'bearer ' + token)
                    .send({
                        ...updateBookmark,
                        fieldToIgnore: 'Dummy'
                    })
                    .expect(204)
                    .then(res => 
                        supertest(app)
                            .get(`/api/bookmarks/${idToUpdate}`)
                            .set('Authorization', 'bearer ' + token)
                            .expect(expectedBookmark)
                    )
            })
        })
    })
})