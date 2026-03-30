import React, { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, InlineLoading, InlineNotification, TextInput, Tile } from '@carbon/react';
import {
  ArrowRightIcon,
  getCoreTranslation,
  navigate as openmrsNavigate,
  openmrsFetch,
  restBaseUrl,
  useConfig,
} from '@openmrs/esm-framework';
import { type ConfigSchema } from '../config-schema';
import Logo from '../logo.component';
import Footer from '../footer.component';
import styles from '../login/login.scss';

const TotpLogin: React.FC = () => {
  const { links: loginLinks } = useConfig<ConfigSchema>();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [code, setCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const codeInputRef = useRef<HTMLInputElement>(null);

  const handleCodeChange = useCallback((evt: React.ChangeEvent<HTMLInputElement>) => {
    const value = evt.target.value.replace(/\D/g, '');
    if (value.length <= 6) {
      setCode(value);
    }
  }, []);

  const handleSubmit = useCallback(
    async (evt: React.FormEvent<HTMLFormElement>) => {
      evt.preventDefault();
      evt.stopPropagation();

      if (code.length !== 6) {
        codeInputRef.current?.focus();
        return;
      }

      try {
        setIsSubmitting(true);
        setErrorMessage('');

        const response = await openmrsFetch(`${restBaseUrl}/session/totp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: { code },
        });

        if (response.data?.authenticated) {
          openmrsNavigate({ to: loginLinks?.loginSuccess || '${openmrsSpaBase}/home' });
        } else {
          setErrorMessage(t('invalidTotpCode', 'Invalid verification code. Please try again.'));
          setCode('');
          codeInputRef.current?.focus();
        }
      } catch (error: unknown) {
        if (error instanceof Error) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage(t('invalidTotpCode', 'Invalid verification code. Please try again.'));
        }
        setCode('');
        codeInputRef.current?.focus();
      } finally {
        setIsSubmitting(false);
      }
    },
    [code, loginLinks, t],
  );

  return (
    <div className={styles.container}>
      <Tile className={styles.loginCard}>
        {errorMessage && (
          <div className={styles.errorMessage}>
            <InlineNotification
              kind="error"
              onClick={() => setErrorMessage('')}
              subtitle={errorMessage}
              title={getCoreTranslation('error')}
            />
          </div>
        )}
        <div className={styles.center}>
          <Logo t={t} />
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.inputGroup}>
            <p>{t('totpPrompt', 'Enter the 6-digit code from your authenticator app.')}</p>
            <TextInput
              autoFocus
              id="totp-code"
              inputMode="numeric"
              labelText={t('verificationCode', 'Verification code')}
              maxLength={6}
              onChange={handleCodeChange}
              pattern="[0-9]{6}"
              placeholder="000000"
              ref={codeInputRef}
              value={code}
            />
            <Button
              className={styles.continueButton}
              disabled={isSubmitting || code.length !== 6}
              iconDescription={t('verifyButtonDescription', 'Verify code')}
              renderIcon={(props) => <ArrowRightIcon size={24} {...props} />}
              type="submit"
            >
              {isSubmitting ? (
                <InlineLoading className={styles.loader} description={t('verifying', 'Verifying') + '...'} />
              ) : (
                t('verify', 'Verify')
              )}
            </Button>
          </div>
        </form>
      </Tile>
      <Footer />
    </div>
  );
};

export default TotpLogin;
