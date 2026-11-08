const jobs = [
  {
    id: 'job-1',
    printer: 'Kitchen Printer',
    ticketType: 'KITCHEN',
    payload: { orderNumber: 'CS-20261108-00125', items: ['Rice and Stew', 'Chicken Curry'] },
  },
  {
    id: 'job-2',
    printer: 'Bar Printer',
    ticketType: 'BAR',
    payload: { orderNumber: 'CS-20261108-00125', items: ['Fresh Juice', 'Soda'] },
  },
];

function processJobs() {
  console.log('Printer service running in local network mode');
  jobs.forEach((job) => {
    console.log(`Queued job ${job.id} for ${job.printer} | status: PENDING -> SENT`);
  });
}

processJobs();
setInterval(() => {
  console.log('Awaiting new print jobs...');
}, 15000);
