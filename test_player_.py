import { createDirectus, rest, readItems } from 'https://esm.sh/@directus/sdk';

        // Create the Directus client
        const client = createDirectus('http://localhost:8055').with(rest());

        // Function to fetch player items
        async function fetchPlayers() {
            try {
                // Make the request to fetch players
                const result = await client.request(readItems('players'));
                console.log(result);

                // Display result in the HTML
                document.getElementById('output').textContent = JSON.stringify(result, null, 2);
            } catch (error) {
                console.error('Error fetching players:', error);
                document.getElementById('output').textContent = 'Error fetching players: ' + error.message;
            }
        }

        // Fetch players
        fetchPlayers();
