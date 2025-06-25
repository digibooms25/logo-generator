import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BusinessInfoCollectionForm from './BusinessInfoCollectionForm';

// Mock the LLM service
jest.mock('@/services/llm-integration', () => ({
  llmService: {
    extractBusinessInformation: jest.fn(),
  },
}));

describe('BusinessInfoCollectionForm', () => {
  const mockOnDataChange = jest.fn();
  const mockOnSubmit = jest.fn();

  const defaultProps = {
    onDataChange: mockOnDataChange,
    onSubmit: mockOnSubmit,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render form fields', () => {
    render(<BusinessInfoCollectionForm {...defaultProps} />);

    expect(screen.getByText('Smart Business Information Extraction')).toBeInTheDocument();
    expect(screen.getByLabelText(/company name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/industry/i)).toBeInTheDocument();
  });

  it('should handle input changes', async () => {
    const user = userEvent.setup();
    render(<BusinessInfoCollectionForm {...defaultProps} />);

    const companyNameInput = screen.getByLabelText(/company name/i);
    await user.type(companyNameInput, 'TechCorp');

    await waitFor(() => {
      expect(mockOnDataChange).toHaveBeenCalledWith(
        expect.objectContaining({
          companyName: 'TechCorp'
        })
      );
    });
  });
});
