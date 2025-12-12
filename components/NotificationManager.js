export const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
        console.log('This browser does not support desktop notification');
        return false;
    }

    if (Notification.permission === 'granted') {
        return true;
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    return false;
};

export const sendNotification = (title, body, icon = '/logo.png') => {
    if (Notification.permission === 'granted') {
        // Check if document is hidden (optional: only notify if user is tabbed away for less annoyance? 
        // Or always notify for critical alerts? Let's notify always for now)

        new Notification(title, {
            body,
            icon,
            // Tag allows replacing existing notification with same tag
            tag: title
        });
    }
};
