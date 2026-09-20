import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import StatusBadge from './StatusBadge';

describe('StatusBadge', () => {
  it.each([
    ['pending', 'Pendiente'],
    ['confirmed', 'Confirmada'],
    ['cancelled', 'Cancelada'],
  ])('muestra "%s" como "%s"', (status, label) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('cae de vuelta al valor crudo si el status no es reconocido', () => {
    render(<StatusBadge status="algo-desconocido" />);
    expect(screen.getByText('algo-desconocido')).toBeInTheDocument();
  });
});
