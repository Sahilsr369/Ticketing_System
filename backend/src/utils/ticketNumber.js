const prisma = require('./prisma');

/**
 * Generates next sequential ticket number: INC-000001, INC-000002 …
 * Uses a DB query to find the highest existing number — safe for concurrent inserts
 * because the ticket has a UNIQUE constraint on ticket_number.
 */
async function generateTicketNumber() {
  const last = await prisma.ticket.findFirst({
    orderBy: { ticketNumber: 'desc' },
    select:  { ticketNumber: true },
  });

  let next = 1;
  if (last?.ticketNumber) {
    const match = last.ticketNumber.match(/INC-(\d+)$/);
    if (match) next = parseInt(match[1], 10) + 1;
  }

  return `INC-${String(next).padStart(6, '0')}`;
}

module.exports = { generateTicketNumber };
