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

function booleanOrIntegerConversion(value) {
    if (value === 'true') return true;
    if (value === 'false') return false;
    const number = Number(value);
    return value !== '' && !Number.isNan(number) ? number : value;
}

function getValue(record, field, resolvers) {
    if (resolvers[field]) return resolvers[field](record);
    return field.split('.').reduce((obj, k) => obj?.[k], record); // supports a.b.c
}

function applyFilters(data, filters, resolvers = {}) {
    if (!filters.length) {
        return data;
    }

    return data.filter(record =>
        filters.every(({parameter, option, value}) => {
            let actual = getValue(record, parameter, resolvers);
            if (actual === undefined || actual === null) return false;
            if (Array.isArray(actual)) actual = actual.length;
            return filterOptions[option](actual, booleanOrIntegerConversion(value));
        })
    )

}