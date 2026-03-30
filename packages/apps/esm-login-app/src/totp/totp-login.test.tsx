import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { openmrsFetch, useConfig } from '@openmrs/esm-framework';
import { mockConfig } from '../../__mocks__/config.mock';
import renderWithRouter from '../test-helpers/render-with-router';
import TotpLogin from './totp-login.component';

const mockOpenmrsFetch = vi.mocked(openmrsFetch);
const mockUseConfig = vi.mocked(useConfig);

describe('TotpLogin', () => {
  beforeEach(() => {
    mockUseConfig.mockReturnValue(mockConfig);
    mockOpenmrsFetch.mockReset();
  });

  it('renders the TOTP login form', () => {
    renderWithRouter(TotpLogin, {}, { route: '/login/totp' });

    expect(screen.getAllByRole('img', { name: /OpenMRS logo/i })).toHaveLength(2);
    expect(screen.getByText(/Enter the 6-digit code from your authenticator app/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Verification code/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Verify/i })).toBeInTheDocument();
  });

  it('should only allow numeric input up to 6 digits', async () => {
    renderWithRouter(TotpLogin, {}, { route: '/login/totp' });
    const user = userEvent.setup();

    const codeInput = screen.getByLabelText(/Verification code/i);
    await user.type(codeInput, 'abc123def456');

    expect(codeInput).toHaveValue('123456');
  });

  it('should disable the verify button when code is less than 6 digits', () => {
    renderWithRouter(TotpLogin, {}, { route: '/login/totp' });

    const verifyButton = screen.getByRole('button', { name: /Verify/i });
    expect(verifyButton).toBeDisabled();
  });

  it('should submit the TOTP code and navigate on success', async () => {
    mockOpenmrsFetch.mockResolvedValue({ data: { authenticated: true } } as any);

    renderWithRouter(TotpLogin, {}, { route: '/login/totp' });
    const user = userEvent.setup();

    const codeInput = screen.getByLabelText(/Verification code/i);
    await user.type(codeInput, '123456');

    const verifyButton = screen.getByRole('button', { name: /Verify/i });
    expect(verifyButton).toBeEnabled();
    await user.click(verifyButton);

    await waitFor(() => {
      expect(mockOpenmrsFetch).toHaveBeenCalledWith(
        expect.stringContaining('/session/totp'),
        expect.objectContaining({
          method: 'POST',
          body: { code: '123456' },
        }),
      );
    });
  });

  it('should display an error message on invalid code', async () => {
    mockOpenmrsFetch.mockRejectedValue(new Error('Invalid code'));

    renderWithRouter(TotpLogin, {}, { route: '/login/totp' });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/Verification code/i), '999999');
    await user.click(screen.getByRole('button', { name: /Verify/i }));

    await waitFor(() => {
      expect(screen.getByText(/Invalid code/i)).toBeInTheDocument();
    });
  });

  it('should clear the code input after a failed submission', async () => {
    mockOpenmrsFetch.mockRejectedValue(new Error('Invalid code'));

    renderWithRouter(TotpLogin, {}, { route: '/login/totp' });
    const user = userEvent.setup();

    const codeInput = screen.getByLabelText(/Verification code/i);
    await user.type(codeInput, '999999');
    await user.click(screen.getByRole('button', { name: /Verify/i }));

    await waitFor(() => {
      expect(codeInput).toHaveValue('');
    });
  });

  it('should focus the code input on mount', () => {
    renderWithRouter(TotpLogin, {}, { route: '/login/totp' });

    expect(screen.getByLabelText(/Verification code/i)).toHaveFocus();
  });
});
