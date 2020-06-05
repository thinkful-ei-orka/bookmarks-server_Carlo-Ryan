'use strict';
const app = require('../src/app');
const token = '$2a$10$ra1z0n2XnSnbMP/ipTMHeOqqrI7i8Rssm/z8MHTxgb7LamV7LpfXu';

describe('App', () => {
  it('GET / responds with bookmarks list', () => {
    return supertest(app)
      .get('/bookmarks')
      .set('Authorization', 'bearer ' + token)
      .expect('Content-Type', /json/)
      .expect(200);
  });
  it('POST responds with 400 defining errors', () => {
    return supertest(app)
      .post('/bookmarks')
      .set('Authorization', 'bearer ' + token)
      .query({
        title: 'awful title',
        description: 'bad description',
        url: 'invalidURL',
        rating: '4',
      })
      .expect(400, `URL must begin with https://`);
  });
});
