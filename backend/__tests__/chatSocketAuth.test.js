// Regression test for the socket impersonation fix: every socket connection
// must present a valid JWT (verified server-side) before any event handler
// runs, and socket.userId must come from that verified token — never from
// a client-supplied argument. Models are mocked; only the io.use(...)
// auth middleware itself is under test here.
jest.mock('../models/Message');
jest.mock('../models/Workspace');
jest.mock('../models/User');
jest.mock('../models/Notification');
jest.mock('jsonwebtoken');

const jwt = require('jsonwebtoken');
const chatSocket = require('../sockets/chatSocket');

function makeFakeIo() {
  const io = {
    use: jest.fn(),
    on: jest.fn(),
  };
  return io;
}

describe('socket connection auth (chatSocket.js io.use middleware)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
  });

  it('registers exactly one auth middleware before wiring up connection handlers', () => {
    const io = makeFakeIo();
    chatSocket(io);
    expect(io.use).toHaveBeenCalledTimes(1);
    expect(io.on).toHaveBeenCalledWith('connection', expect.any(Function));
  });

  it('rejects a connection with no token', () => {
    const io = makeFakeIo();
    chatSocket(io);
    const authMiddleware = io.use.mock.calls[0][0];

    const socket = { handshake: { auth: {} } };
    const next = jest.fn();
    authMiddleware(socket, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(socket.userId).toBeUndefined();
  });

  it('rejects a connection with an invalid token', () => {
    jwt.verify.mockImplementation(() => {
      throw new Error('bad signature');
    });
    const io = makeFakeIo();
    chatSocket(io);
    const authMiddleware = io.use.mock.calls[0][0];

    const socket = { handshake: { auth: { token: 'garbage' } } };
    const next = jest.fn();
    authMiddleware(socket, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(socket.userId).toBeUndefined();
  });

  it('sets socket.userId from the verified token payload and allows the connection', () => {
    jwt.verify.mockReturnValue({ id: 'real-user-id' });
    const io = makeFakeIo();
    chatSocket(io);
    const authMiddleware = io.use.mock.calls[0][0];

    const socket = { handshake: { auth: { token: 'valid.jwt' } } };
    const next = jest.fn();
    authMiddleware(socket, next);

    expect(socket.userId).toBe('real-user-id');
    expect(next).toHaveBeenCalledWith(); // called with no error
  });
});
