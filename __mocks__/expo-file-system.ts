export const documentDirectory = '/mock/documents/';

export const makeDirectoryAsync = jest.fn().mockResolvedValue(undefined);
export const downloadAsync = jest.fn().mockResolvedValue({ status: 200 });
export const deleteAsync = jest.fn().mockResolvedValue(undefined);

export const createDownloadResumable = jest.fn(() => ({
  downloadAsync: jest.fn().mockResolvedValue({ status: 200 }),
  pauseAsync: jest.fn(),
  resumeAsync: jest.fn(),
}));
