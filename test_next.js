try {
    console.log('Attempting to require next...');
    const next = require('next');
    console.log('Next loaded successfully');
} catch (e) {
    console.error('Error loading next:', e);
}
