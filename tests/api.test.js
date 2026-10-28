const request = require('supertest');

jest.mock('../config', () => ({
    config: {
        routes: ['persons', 'pets'],
        relationships: {
            pets: [{ relatedRoute: 'persons', foreignKey: 'ownerIds' }],
        },
        persons: [],
        pets: [],
    },
    saveConfig: jest.fn(),
}));

const { config } = require('../config');
const app = require('../app');

// POST still generates a UUID for new pets; only the seed data uses integer ids.
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const seed = {
    persons: [
        { id: '1', name: 'Jan' },
        { id: '2', name: 'Sofie' },
        { id: '3', name: 'Tim' },
    ],
    pets: [
        { id: '1', type: 'dog', name: 'Jimmy', ownerIds: ['2'] },
        { id: '2', type: 'cat', name: 'Duvel', ownerIds: ['1', '2'] },
        { id: '3', type: 'vis', name: 'Freddy', ownerIds: ['1'] },
    ],
};

beforeEach(() => {
    const fresh = structuredClone(seed);
    config.persons.splice(0, config.persons.length, ...fresh.persons);
    config.pets.splice(0, config.pets.length, ...fresh.pets);
});

const validPet = { name: 'Bella', type: 'dog', ownerIds: ['3'] };

describe('GET /', () => {
    it('renders the index page', async () => {
        const res = await request(app).get('/');

        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toMatch(/html/);
        expect(res.text).toMatch(/persons and pets/);
    });
});

describe('GET /:route', () => {
    it('returns all persons', async () => {
        const res = await request(app).get('/persons');

        expect(res.status).toBe(200);
        expect(res.body).toEqual(seed.persons);
    });

    it('returns all pets', async () => {
        const res = await request(app).get('/pets');

        expect(res.status).toBe(200);
        expect(res.body).toEqual(seed.pets);
    });

    it('returns 404 for an unknown route', async () => {
        const res = await request(app).get('/cars');

        expect(res.status).toBe(404);
        expect(res.body).toEqual({ error: 'Route cars not found' });
    });

    it('embeds owners in every pet with ?embed=owners', async () => {
        const res = await request(app).get('/pets?embed=owners');

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(3);

        const duvel = res.body.find((p) => p.id === '2');
        expect(duvel.owners.map((o) => o.name).sort()).toEqual(['Jan', 'Sofie']);
    });
});

describe('GET /:route/:id', () => {
    it('returns a person by id', async () => {
        const res = await request(app).get('/persons/2');

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ id: '2', name: 'Sofie' });
    });

    it('returns a pet by id', async () => {
        const res = await request(app).get('/pets/3');

        expect(res.status).toBe(200);
        expect(res.body).toEqual(seed.pets['2']);
    });

    it('returns 404 for an unknown id', async () => {
        const res = await request(app).get('/persons/99');

        expect(res.status).toBe(404);
        expect(res.body).toEqual({ error: 'Record with ID 99 not found in persons' });
    });

    it('returns 404 for an unknown route', async () => {
        const res = await request(app).get('/cars/1');

        expect(res.status).toBe(404);
        expect(res.body).toEqual({ error: 'Route cars not found' });
    });

    it('embeds owners for a single pet with ?embed=owners', async () => {
        const res = await request(app).get('/pets/2?embed=owners');

        expect(res.status).toBe(200);
        expect(res.body.name).toBe('Duvel');
        expect(res.body.owners.map((o) => o.name).sort()).toEqual(['Jan', 'Sofie']);
    });
});

describe('POST /pets', () => {
    it('creates a pet and returns 201 with a generated uuid', async () => {
        const res = await request(app).post('/pets').send(validPet);

        expect(res.status).toBe(201);
        expect(res.body).toMatchObject(validPet);
        expect(res.body.id).toMatch(UUID_REGEX);
        expect(config.pets).toHaveLength(4);

        const check = await request(app).get(`/pets/${res.body.id}`);
        expect(check.status).toBe(200);
        expect(check.body).toEqual(res.body);
    });

    it('returns 400 for an invalid body', async () => {
        const res = await request(app).post('/pets').send({});

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error');
        expect(config.pets).toHaveLength(3);
    });

    it('returns 400 when the body is not JSON', async () => {
        const res = await request(app)
            .post('/pets')
            .set('Content-Type', 'text/plain')
            .send('not json');

        expect(res.status).toBe(400);
        expect(config.pets).toHaveLength(3);
    });
});

describe('PUT /pets/:id', () => {
    it('replaces an existing pet', async () => {
        const update = { name: 'Freddy II', type: 'vis', ownerIds: ['1', '3'] };
        const res = await request(app).put('/pets/3').send(update);

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject(update);
        expect(String(res.body.id)).toBe('3');

        const check = await request(app).get('/pets/3');
        expect(check.body).toMatchObject(update);
    });

    it('works for a pet created via POST', async () => {
        const created = await request(app).post('/pets').send(validPet);
        const res = await request(app)
            .put(`/pets/${created.body.id}`)
            .send({ ...validPet, name: 'Bella Renamed' });

        expect(res.status).toBe(200);
        expect(res.body.name).toBe('Bella Renamed');
    });

    it('returns 404 for an unknown id', async () => {
        const res = await request(app).put('/pets/99').send(validPet);

        expect(res.status).toBe(404);
        expect(res.body).toEqual({ error: 'Pet with ID 99 not found' });
    });

    it('returns 400 when the body id does not match the url id', async () => {
        const res = await request(app)
            .put('/pets/3')
            .send({ ...validPet, id: '4' });

        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: 'ID in body does not match ID in URL' });
    });

    it('returns 400 for an invalid body and leaves the pet unchanged', async () => {
        const res = await request(app).put('/pets/3').send({});

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error');
        expect(config.pets.find((p) => p.id === '3').name).toBe('Freddy');
    });
});

describe('DELETE /pets/:id', () => {
    it('deletes an existing pet and returns 204', async () => {
        const res = await request(app).delete('/pets/3');

        expect(res.status).toBe(204);
        expect(res.text).toBe('');
        expect(config.pets).toHaveLength(2);
        expect(config.pets.find((p) => p.id === '3')).toBeUndefined();

        const check = await request(app).get('/pets/3');
        expect(check.status).toBe(404);
    });

    it('returns 404 for an unknown id', async () => {
        const res = await request(app).delete('/pets/99');

        expect(res.status).toBe(404);
        expect(res.body).toEqual({ error: 'Pet with ID 99 not found' });
        expect(config.pets).toHaveLength(3);
    });
});