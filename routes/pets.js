// routes/pets.js
const express = require('express');
const crypto = require('crypto');
const { config } = require('../config');
const { findPetIndex, validatePet } = require('../lib/pets')

const router = express.Router();


router.post('/', (req, res) => {
    const { error, value } = validatePet(req.body);
    if (error) {
        return res.status(400).json({ error });
    }

    const newPet = { id: crypto.randomUUID(), ...value };
    config.pets.push(newPet);

    res.status(201).json(newPet);
});

router.put('/:id', (req, res) => {
    const { id } = req.params;
    const index = findPetIndex(id);

    if (index === -1) {
        return res.status(404).json({ error: `Pet with ID ${id} not found` });
    }

    if (req.body?.id !== undefined && req.body.id !== id) {
        return res.status(400).json({ error: 'ID in body does not match ID in URL' });
    }

    const { error, value } = validatePet(req.body);
    if (error) {
        return res.status(400).json({ error });
    }

    const updatedPet = { id, ...value };
    config.pets[index] = updatedPet;

    res.json(updatedPet);
});

router.delete('/:id', (req, res) => {
    const { id } = req.params;
    const index = findPetIndex(id);

    if (index === -1) {
        return res.status(404).json({ error: `Pet with ID ${id} not found` });
    }

    config.pets.splice(index, 1);

    res.status(204).end();
});

module.exports = router;