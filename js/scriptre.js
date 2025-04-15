// No external libraries needed for this basic functionality yet.
// import _ from 'lodash'; // Example if lodash were needed

const form = document.getElementById('schedule-form');
const outputElement = document.getElementById('output');
const dataListElement = document.getElementById('data-list');
const servicesSelect = document.getElementById('services-select'); // NEW: Select element
const otherServiceWrapper = document.getElementById('other-service-wrapper'); // NEW: Wrapper div
const otherServiceText = document.getElementById('service-other');
const dateInput = document.getElementById('date'); // Get the date input

// --- State Management ---
// Store unavailable slots as an object: { "YYYY-MM-DD": [{ start: "HH:MM", end: "HH:MM" }, ...], ... }
let unavailableTimeSlots = JSON.parse(localStorage.getItem('unavailableTimeSlots') || '{}');
let allEntries = JSON.parse(localStorage.getItem('allEntries') || '[]');

// --- Helper Function: Check for Time Overlap ---
/**
 * Checks if a new time range overlaps with existing time ranges for a specific date.
 * @param {string} newStart - New start time (HH:MM)
 * @param {string} newEnd - New end time (HH:MM)
 * @param {Array<Object>} existingSlots - Array of {start: "HH:MM", end: "HH:MM"} objects.
 * @returns {boolean} - True if there is an overlap, false otherwise.
 */
function isTimeOverlap(newStart, newEnd, existingSlots = []) {
    // Convert times to minutes since midnight for easier comparison
    const timeToMinutes = (time) => {
        if (!time || !time.includes(':')) return 0; // Handle potential invalid time format
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    };

    const newStartMinutes = timeToMinutes(newStart);
    const newEndMinutes = timeToMinutes(newEnd);

    // Basic validation: end time must be after start time
    if (newEndMinutes <= newStartMinutes) {
        console.warn("End time must be after start time.");
        // Consider alerting the user directly here or returning a specific error type
        return true; // Treat as overlap to prevent invalid data
    }

    for (const slot of existingSlots) {
        const existingStartMinutes = timeToMinutes(slot.start);
        const existingEndMinutes = timeToMinutes(slot.end);

        // Check for overlap conditions:
        // An overlap occurs if:
        // (newStart < existingEnd) AND (newEnd > existingStart)
        if (newStartMinutes < existingEndMinutes && newEndMinutes > existingStartMinutes) {
            console.log(`Overlap detected: New [${newStart}-${newEnd}] vs Existing [${slot.start}-${slot.end}]`);
            return true; // Overlap detected
        }
    }
    return false; // No overlap
}

// --- Initialize Flatpickr ---
// We are *not* disabling full dates anymore. Time slot validation happens on submit.
const fp = flatpickr(dateInput, {
    dateFormat: "Y-m-d", // Standard format
    altInput: true, // Show user-friendly format
    altFormat: "F j, Y", // User-friendly format
    locale: "es", // Use Spanish locale
    minDate: "today", // Add this line to disable past dates
    // disable: datesWithBookings, // REMOVED: Don't disable entire dates
    onChange: function(selectedDates, dateStr, instance) {
        // TODO (Optional Enhancement): When date changes, could fetch and display
        // existing bookings for that day to guide the user.
        console.log("Selected date:", dateStr);
        // Clear time inputs when date changes? Maybe helpful.
        // document.getElementById('start-time').value = '';
        // document.getElementById('end-time').value = '';
    },
    // onDayCreate is no longer needed for disabling based on bookings
});

// --- Initial Setup ---
// NEW: Add event listener to the <select> element
servicesSelect.addEventListener('change', (event) => {
    // Get all selected option values
    const selectedOptions = Array.from(event.target.selectedOptions).map(option => option.value);

    // Check if 'Otro' is selected
    if (selectedOptions.includes('Otro')) {
        otherServiceWrapper.style.display = 'block'; // Show the wrapper
        otherServiceText.disabled = false; // Enable the text input
        otherServiceText.focus(); // Focus the input
    } else {
        otherServiceWrapper.style.display = 'none'; // Hide the wrapper
        otherServiceText.disabled = true; // Disable the text input
        otherServiceText.value = ''; // Clear text if 'Otro' is deselected
    }
});

// --- Form Submission ---
form.addEventListener('submit', (event) => {
    event.preventDefault(); // Prevent default form submission

    const formData = new FormData(form);
    const data = { id: Date.now() }; // Add a unique ID
    // Get selected services from the select element
    const selectedServices = Array.from(servicesSelect.selectedOptions).map(option => option.value);
    let selectedDate = '';
    let startTime = '';
    let endTime = '';
    let otherServiceValue = formData.get('service-other')?.trim() || ''; // Get other service text

    formData.forEach((value, key) => {
        if (key === 'date') {
            selectedDate = value; // Flatpickr returns YYYY-MM-DD format
            data[key] = value;
        } else if (key === 'start-time') {
            startTime = value;
            data[key] = value;
        } else if (key === 'end-time') {
            endTime = value;
            data[key] = value;
        // 'services' key from FormData won't reliably give all multiple selections,
        // so we handle it separately using servicesSelect.selectedOptions above.
        // We also handle 'service-other' separately.
        } else if (key !== 'services' && key !== 'service-other') { // Catch other potential fields
            data[key] = value;
        }
    });

     // --- Input Validation ---
    if (!selectedDate || !startTime || !endTime) {
        alert('Por favor, seleccione fecha y horas de inicio y fin.');
        return;
    }
     if (endTime <= startTime) {
         alert('La hora "Hasta" debe ser posterior a la hora "Desde".');
         return;
     }
     // Check if any service is selected in the dropdown
     if (selectedServices.length === 0) {
         alert('Por favor, seleccione al menos un servicio de la lista.');
         return;
     }
      // Check if 'Otro' is selected but the text field is empty
      const isOtroSelected = selectedServices.includes('Otro');
      if (isOtroSelected && otherServiceValue === '') {
         alert('Por favor, especifique el servicio "Otro".');
         return;
     }

    // *** Check for time overlap on the selected date ***
    // This check correctly prevents double-booking the same time slot, regardless of service.
    const existingSlotsForDate = unavailableTimeSlots[selectedDate] || [];
    if (isTimeOverlap(startTime, endTime, existingSlotsForDate)) {
        // Provide more specific feedback - Updated Message
        let message = `Conflicto de horario: El intervalo ${startTime} - ${endTime} el día ${selectedDate} ya está ocupado o se superpone con otra reserva.\n\nHorarios ya reservados para este día:\n`;
        if (existingSlotsForDate.length > 0) {
            existingSlotsForDate.forEach(slot => {
                message += `- ${slot.start} a ${slot.end}\n`;
            });
        } else {
             message = `Error inesperado al comprobar la disponibilidad para ${selectedDate} ${startTime}-${endTime}.`;
        }
        message += "\nPor favor, seleccione un horario diferente."; // Revised prompt
        alert(message);
        return; // Stop submission
    }

    // Process the 'Otro' service: Replace 'Otro' with the specific text if provided
    const finalServices = selectedServices.map(service => {
        if (service === 'Otro' && otherServiceValue !== '') {
            return `Otro: ${otherServiceValue}`;
        }
        return service;
    }).filter(service => service !== 'Otro' || otherServiceValue !== ''); // Remove 'Otro' if value is empty (validation should prevent this)

    // Prevent saving if, after processing 'Otro', no services remain (e.g., only 'Otro' was selected and text was empty)
    if (finalServices.length === 0) {
        alert('Error: No se ha seleccionado ningún servicio válido.');
        return;
    }

    data.services = finalServices; // Assign the processed services list

    // 1. Display the newly collected data as JSON (optional, for debugging/confirmation)
    outputElement.textContent = `Datos recién guardados:\n${JSON.stringify(data, null, 2)}`; // Pretty print JSON

    // 2. Add time slot to unavailable list for the date and save
    if (!unavailableTimeSlots[selectedDate]) {
        unavailableTimeSlots[selectedDate] = []; // Initialize array if date is new
    }
    unavailableTimeSlots[selectedDate].push({ start: startTime, end: endTime });
    // Sort time slots within the date for cleaner data and easier checking
    unavailableTimeSlots[selectedDate].sort((a, b) => a.start.localeCompare(b.start));
    localStorage.setItem('unavailableTimeSlots', JSON.stringify(unavailableTimeSlots));

    // 3. Add new entry to the main list and save
    allEntries.push(data);
    // Sort all entries chronologically before saving and displaying
     allEntries.sort((a, b) => {
        // Combine date and start time for accurate sorting
        const dateTimeA = new Date(`${a.date}T${a['start-time']}`);
        const dateTimeB = new Date(`${b.date}T${b['start-time']}`);
        return dateTimeA - dateTimeB;
    });
    localStorage.setItem('allEntries', JSON.stringify(allEntries));

    // 4. Update Flatpickr - REMOVED: No need to disable dates anymore
    // const updatedDisabledDates = Object.keys(unavailableTimeSlots);
    // fp.set('disable', updatedDisabledDates); // NO LONGER NEEDED

    // 5. Display all stored data in the formatted list (will now be sorted)
    displayAllDataAsList();

    // Optional: Clear the form after submission
    form.reset();
    fp.clear(); // Clear the flatpickr input specifically
    // Reset the services select dropdown (deselect all options)
    Array.from(servicesSelect.options).forEach(option => option.selected = false);
    // Hide and disable the 'other' service input again
    otherServiceWrapper.style.display = 'none';
    otherServiceText.disabled = true;
    otherServiceText.value = '';
    // Clear the last saved output
    // outputElement.textContent = '';
});

// --- Display Functions ---
function displayDataEntry(data, container) {
    const entryDiv = document.createElement('div');
    entryDiv.classList.add('data-entry'); // Add a class for styling individual entries
    entryDiv.dataset.id = data.id; // Store ID for potential future actions (like deletion)

    const heading = document.createElement('h4');
    // Format date for display if needed, otherwise use the stored string
    try {
      // Add time T00:00:00 to avoid timezone issues when parsing only date
      // Use UTC to prevent off-by-one day errors due to local timezone offset
      const dateObj = new Date(data.date + 'T00:00:00Z'); // Treat as UTC
       heading.textContent = `Disponibilidad para: ${dateObj.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}`;
    } catch(e) {
        heading.textContent = `Disponibilidad para: ${data.date || 'Fecha inválida'}`;
        console.error("Error parsing date:", data.date, e);
    }

    entryDiv.appendChild(heading);

    const detailsList = document.createElement('ul');

    const timeItem = document.createElement('li');
    timeItem.innerHTML = `<strong>Horario:</strong> ${data['start-time'] || 'N/A'} - ${data['end-time'] || 'N/A'}`;
    detailsList.appendChild(timeItem);

    if (data.services && data.services.length > 0) {
        const servicesItem = document.createElement('li');
        servicesItem.innerHTML = '<strong>Servicios:</strong>';
        const servicesSubList = document.createElement('ul');
        data.services.forEach(service => {
            const subItem = document.createElement('li');
            subItem.textContent = service;
            servicesSubList.appendChild(subItem);
        });
        servicesItem.appendChild(servicesSubList);
        detailsList.appendChild(servicesItem);
    } else {
        const noServicesItem = document.createElement('li');
        noServicesItem.innerHTML = '<strong>Servicios:</strong> Ninguno seleccionado';
        detailsList.appendChild(noServicesItem);
    }

    // --- Add Delete Button ---
    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Eliminar';
    deleteButton.classList.add('delete-button'); // Add class for styling
    deleteButton.onclick = () => handleDeleteEntry(data.id); // Add click handler
    entryDiv.appendChild(deleteButton);
    // --- End Add Delete Button ---


    entryDiv.appendChild(detailsList);
    container.appendChild(entryDiv);
}

// --- Delete Function ---
function handleDeleteEntry(idToDelete) {
    console.log("Attempting to delete entry with ID:", idToDelete);
    const securityPassword = "Password2025**."; // The required password

    // Find the entry to delete (needed for confirmation message context)
    const entryToDelete = allEntries.find(entry => entry.id === idToDelete);
    if (!entryToDelete) {
        console.error("Entry not found for deletion:", idToDelete);
        alert("Error: No se pudo encontrar la entrada para eliminar.");
        return;
    }

    // Prompt for the security password
    const enteredPassword = prompt(`Para eliminar la disponibilidad (${entryToDelete.date} ${entryToDelete['start-time']}-${entryToDelete['end-time']}), por favor ingrese la clave de seguridad:`);

    // Check if the user cancelled the prompt
    if (enteredPassword === null) {
        console.log("Deletion cancelled by user.");
        return; // User pressed Cancel
    }

    // Check if the entered password matches the required password
    if (enteredPassword !== securityPassword) {
        alert("Clave de seguridad incorrecta. La eliminación ha sido cancelada.");
        console.log("Incorrect password entered.");
        return; // Incorrect password
    }

    // --- Password is correct, proceed with deletion ---
    console.log("Password correct. Proceeding with deletion.");

    // 1. Remove the entry from the main list
    allEntries = allEntries.filter(entry => entry.id !== idToDelete);

    // 2. Remove the corresponding time slot from unavailableTimeSlots
    const dateKey = entryToDelete.date;
    if (unavailableTimeSlots[dateKey]) {
        unavailableTimeSlots[dateKey] = unavailableTimeSlots[dateKey].filter(slot =>
            !(slot.start === entryToDelete['start-time'] && slot.end === entryToDelete['end-time'])
        );
        // If no more slots exist for this date, remove the date key entirely
        if (unavailableTimeSlots[dateKey].length === 0) {
            delete unavailableTimeSlots[dateKey];
        }
    }

    // 3. Update localStorage
    localStorage.setItem('allEntries', JSON.stringify(allEntries));
    localStorage.setItem('unavailableTimeSlots', JSON.stringify(unavailableTimeSlots));

    // 4. Re-display the list
    displayAllDataAsList();

    // 5. Clear the "recently saved" output area and show confirmation
    outputElement.textContent = `Entrada ID ${idToDelete} eliminada correctamente.`;

    // 6. Update Flatpickr - Still not needed based on current logic
    console.log("Entry deleted, unavailable slots updated:", unavailableTimeSlots);
}

function displayAllDataAsList() {
    // Clear previous list content
    dataListElement.innerHTML = '';

    if (allEntries.length === 0) {
        dataListElement.innerHTML = '<p>No hay datos guardados.</p>';
        return;
    }

    // Data is already sorted before saving, just display it
    allEntries.forEach(entry => {
        displayDataEntry(entry, dataListElement);
    });
}

// --- Initial Load ---
displayAllDataAsList(); // Display any previously stored data when the page loads
// Clear the "recently saved" output area on load
outputElement.textContent = '';
// Ensure 'Otro' field is hidden on initial load
otherServiceWrapper.style.display = 'none';
otherServiceText.disabled = true;