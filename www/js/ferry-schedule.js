// Horaires publiés par la Liaison Maritime Dakar-Gorée / Port Autonome de Dakar.
const WEEKDAY_TIMES = {
    "Dakar → Gorée": [
        "06:15", "07:30", "10:00", "11:00", "12:30", "14:30",
        "16:00", "17:00", "18:30", "20:00", "22:30"
    ],
    "Gorée → Dakar": [
        "06:45", "08:00", "10:30", "12:00", "14:00", "15:00",
        "16:30", "18:00", "19:00", "20:30", "23:00"
    ]
};

const SUNDAY_AND_HOLIDAY_TIMES = {
    "Dakar → Gorée": [
        "07:00", "09:00", "10:00", "12:00", "14:00", "16:00",
        "17:00", "18:30", "19:30", "20:30", "22:30", "23:30"
    ],
    "Gorée → Dakar": [
        "07:30", "09:30", "10:30", "12:30", "14:30", "16:30",
        "17:30", "19:00", "20:00", "21:00", "23:00", "00:00"
    ]
};

export function getOfficialDepartureTimes(dateValue, route) {
    if (!dateValue || !WEEKDAY_TIMES[route]) {
        return [];
    }

    // Midi évite les décalages de fuseau lors du calcul du jour de la semaine.
    const date = new Date(`${dateValue}T12:00:00`);
    if (Number.isNaN(date.getTime())) {
        return [];
    }

    const day = date.getDay();
    if (day === 0) {
        return [...SUNDAY_AND_HOLIDAY_TIMES[route]];
    }

    const times = [...WEEKDAY_TIMES[route]];
    if (day === 6) {
        // Le départ de 17 h (Dakar) / 18 h (Gorée) n'a pas lieu le samedi.
        return [
            ...times.filter((time) => time !== "17:00" && time !== "18:00"),
            route === "Dakar → Gorée" ? "00:45" : "01:15"
        ].sort();
    }

    if (day === 5) {
        times.push(route === "Dakar → Gorée" ? "23:30" : "00:00");
    }

    return times.sort();
}
