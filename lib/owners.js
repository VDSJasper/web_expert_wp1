const config = require("../config");

function getOwnersFor(record) {
    const ownerIds = record.ownerIds || [];
    const owners = config.persons || [];

    return ownerIds
        .map(ownerId => owners.find(owner => owner.id === ownerId))
        .filter(Boolean);
}

function getPetsWithOwners() {
    const pets = config.pets || [];
    const ownersById = new Map((config.persons || []).map(o => [o.id, o]));

    return pets.map(pet => ({
        ...pet,
        owners: (pet.ownerIds || [])
            .map(id => ownersById.get(id))
            .filter(Boolean)
    }));
}

module.exports = { getOwnersFor, getPetsWithOwners };