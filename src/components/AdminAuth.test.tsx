import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdminAuth from './AdminAuth';

// Mock sessionStorage
const mockSessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
});

describe('AdminAuth', () => {
  const mockOnAuthenticated = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the authentication form', () => {
    render(<AdminAuth onAuthenticated={mockOnAuthenticated} />);

    expect(screen.getByText('Admin Access')).toBeInTheDocument();
    expect(screen.getByText('Enter the admin password to manage logos and icons')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter admin password')).toBeInTheDocument();
    expect(screen.getByText('Access Admin Panel')).toBeInTheDocument();
  });

  it('shows/hides password when toggle button is clicked', () => {
    render(<AdminAuth onAuthenticated={mockOnAuthenticated} />);

    const passwordInput = screen.getByPlaceholderText('Enter admin password') as HTMLInputElement;
    // Find the toggle button by its position in the relative container
    const container = passwordInput.parentElement;
    const toggleButton = container?.querySelector('button[type="button"]') as HTMLButtonElement;

    // Initially password should be hidden
    expect(passwordInput.type).toBe('password');

    // Click toggle to show password
    if (toggleButton) {
      fireEvent.click(toggleButton);
      expect(passwordInput.type).toBe('text');

      // Click toggle to hide password again
      fireEvent.click(toggleButton);
      expect(passwordInput.type).toBe('password');
    }
  });

  it('shows error message for incorrect password', async () => {
    render(<AdminAuth onAuthenticated={mockOnAuthenticated} />);

    const passwordInput = screen.getByPlaceholderText('Enter admin password');
    const submitButton = screen.getByText('Access Admin Panel');

    // Enter incorrect password
    fireEvent.change(passwordInput, { target: { value: 'wrong-password' } });
    fireEvent.click(submitButton);

    // Should show loading state
    expect(screen.getByText('Authenticating...')).toBeInTheDocument();

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText('Invalid admin password. Please try again.')).toBeInTheDocument();
    });

    // Should not call onAuthenticated
    expect(mockOnAuthenticated).not.toHaveBeenCalled();
  });

  it('authenticates successfully with correct password', async () => {
    render(<AdminAuth onAuthenticated={mockOnAuthenticated} />);

    const passwordInput = screen.getByPlaceholderText('Enter admin password');
    const submitButton = screen.getByText('Access Admin Panel');

    // Enter correct password
    fireEvent.change(passwordInput, { target: { value: 'logo-admin-2024' } });
    fireEvent.click(submitButton);

    // Should show loading state
    expect(screen.getByText('Authenticating...')).toBeInTheDocument();

    // Wait for authentication
    await waitFor(() => {
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith('admin-authenticated', 'true');
      expect(mockOnAuthenticated).toHaveBeenCalled();
    });
  });

  it('disables submit button when password is empty', () => {
    render(<AdminAuth onAuthenticated={mockOnAuthenticated} />);

    const submitButton = screen.getByText('Access Admin Panel') as HTMLButtonElement;

    // Button should be disabled when password is empty
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when password is entered', () => {
    render(<AdminAuth onAuthenticated={mockOnAuthenticated} />);

    const passwordInput = screen.getByPlaceholderText('Enter admin password');
    const submitButton = screen.getByText('Access Admin Panel') as HTMLButtonElement;

    // Enter some text
    fireEvent.change(passwordInput, { target: { value: 'test' } });

    // Button should be enabled
    expect(submitButton).not.toBeDisabled();
  });

  it('shows demo password in the note', () => {
    render(<AdminAuth onAuthenticated={mockOnAuthenticated} />);

    expect(screen.getByText('Demo Password:')).toBeInTheDocument();
    expect(screen.getByText('logo-admin-2024')).toBeInTheDocument();
  });
}); 