// Emit the signal event through IPC so the handler is testable on Windows too.
process.on('message', message => {
  if (message === 'shutdown-test') process.emit('SIGTERM');
});
