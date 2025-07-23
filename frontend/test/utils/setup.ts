import '@testing-library/jest-dom/extend-expect';
import { userEvent } from '@testing-library/user-event';

export const createUser = () => {
  return userEvent.setup();
};
