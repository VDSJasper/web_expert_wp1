const filterOptions = {
    eq:  (a, b) => a == b,
    ne:  (a, b) => a != b,
    gt:  (a, b) => a > b,
    gte: (a, b) => a >= b,
    lt:  (a, b) => a < b,
    lte: (a, b) => a <= b,
    contains: (a, b) => String(a).toLowerCase().includes(String(b).toLowerCase())
}

function parseFilter(query) {
    const filters = [];

    for (const [key, value] of Object.entries(query)) {
        if (key === 'embed') {
            continue;
        }

        const [parameter, option = 'eq'] = key.split(':');
        if (!filterOptions[option]) {
            throw new Error(`Invalid filter option: ${option}`);
        }

        // normaliseren naar array
        const valueArray = Array.isArray(value) ? value : [value];

        for (const v in valueArray) {
            filters.push({parameter, option, value: v});
        }
        return filters;
    }
}