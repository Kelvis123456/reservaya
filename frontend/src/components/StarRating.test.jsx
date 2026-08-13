import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import StarRating from './StarRating';

describe('StarRating', () => {
  it('renderiza 5 estrellas siempre', () => {
    render(<StarRating value={3} />);
    expect(screen.getAllByRole('button')).toHaveLength(5);
  });

  it('llama onChange con el número correcto al hacer click en una estrella', async () => {
    const onChange = vi.fn();
    render(<StarRating value={2} onChange={onChange} />);
    const buttons = screen.getAllByRole('button');
    await userEvent.click(buttons[3]); // 4ta estrella
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('en modo readOnly deshabilita los botones y no llama onChange', async () => {
    const onChange = vi.fn();
    render(<StarRating value={4} onChange={onChange} readOnly />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach((b) => expect(b).toBeDisabled());
    await userEvent.click(buttons[0]);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('no falla si no se pasa onChange y se hace click (uso solo de lectura implícito)', async () => {
    render(<StarRating value={1} />);
    const buttons = screen.getAllByRole('button');
    await expect(userEvent.click(buttons[2])).resolves.not.toThrow();
  });
});
