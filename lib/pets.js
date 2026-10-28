const {config} = require("../config");

function validatePet(body) {
    const { name, type, ownerIds = [] } = body || {};

    if (!name || !type) {
        return { error: 'name and type are required' };
    }
    if (!Array.isArray(ownerIds)) {
        return { error: 'ownerIds must be an array' };
    }

    return { value: { name, type, ownerIds } };
}

function findPetIndex(id) {
    return config.pets.findIndex(pet => pet.id === id);
}

module.exports = { findPetIndex, validatePet };