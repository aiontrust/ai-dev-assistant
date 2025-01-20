test('renders welcome message', () => {
    render(<App />);
    expect(screen.getByText('AI Development Environment Frontend Test')).toBeInTheDocument();
});
