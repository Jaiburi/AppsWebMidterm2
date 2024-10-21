require("dotenv").config();
const express = require('express');
const app = express();
const https = require('https');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.engine('ejs', require('ejs').renderFile);
app.set('view engine', 'ejs');

const fetchPokemonData = (pokemonIdentifier, callback) => {
    https.get(`https://pokeapi.co/api/v2/pokemon/${pokemonIdentifier}`, (apiRes) => {
        let data = '';

        apiRes.on('data', (chunk) => {
            data += chunk;
        });

        apiRes.on('end', () => {
            if (apiRes.statusCode === 200) {
                const pokemonData = JSON.parse(data);
                callback(null, pokemonData);
            } else {
                callback(new Error('Pokemon not found'), null);
            }
        });
    }).on('error', (err) => {
        console.error('Error: ' + err.message);
        callback(new Error('Error interno del servidor'), null);
    });
};

const fetchMultiplePokemon = async (start, count) => {
    let pokemonList = [];
    for (let i = start; i < start + count; i++) {
        if (i > 1025) break; // Límite actual de Pokémon
        await new Promise((resolve) => {
            fetchPokemonData(i, (err, pokemonData) => {
                if (!err) {
                    pokemonList.push(pokemonData);
                }
                resolve();
            });
        });
    }
    return pokemonList;
};

const getAdjacentPokemon = (currentId, direction) => {
    let newId = currentId + direction;
    if (newId < 1) newId = 1025;
    if (newId > 1025) newId = 1;
    return newId;
};

app.route("/")
    .get(async (req, res) => {
        const page = parseInt(req.query.page) || 1;
        const pokemonPerPage = 24; // 8 filas de 3 Pokémon cada una
        const start = (page - 1) * pokemonPerPage + 1;
        
        try {
            const pokemonList = await fetchMultiplePokemon(start, pokemonPerPage);
            res.render("home", { 
                title: 'Welcome to The JS Pokedex',
                pokemonList: pokemonList,
                currentPage: page,
                totalPages: Math.ceil(1025 / pokemonPerPage)
            });
        } catch (error) {
            res.render("home", { 
                title: 'Welcome to The JS Pokedex',
                error: 'Error al cargar los Pokémon'
            });
        }
    });

    app.route("/about")
    .get((req, res) => {
        const pokemonId = req.query.id || 1;
        fetchPokemonData(pokemonId, (err, pokemonData) => {
            if (err) {
                res.render("about", { pokemonData: null, error: err.message, title: 'About The JS Pokedex' });
            } else {
                res.render("about", { pokemonData: pokemonData, found: true, title: 'About The JS Pokedex' });
            }
        });
    });

app.post('/search', (req, res) => {
    const pokemonName = req.body.name; 
    fetchPokemonData(pokemonName, (err, pokemonData) => {
        if (err) {
            res.render("about", { pokemonData: null, error: err.message, title: 'About The JS Pokedex' });
        } else {
            res.render("about", { pokemonData: pokemonData, found: true, title: 'About The JS Pokedex' });
        }
    });
});

app.post('/navigate', (req, res) => {
    const direction = req.body.direction === 'next' ? 1 : -1;
    console.log(req.body.currentId)
    const currentId = parseInt(req.body.currentId) || 1;
    const newId = getAdjacentPokemon(currentId, direction);
    
    fetchPokemonData(newId, (err, pokemonData) => {
        if (err) {
            res.render("about", { pokemonData: null, error: err.message, title: 'About The JS Pokedex' });
        } else {
            res.render("about", { pokemonData: pokemonData, found: true, title: 'About The JS Pokedex' });
        }
    });
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});