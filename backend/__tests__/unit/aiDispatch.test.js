const { analyzeSeverity } = require('../../utils/aiDispatch');

describe('AI Dispatch Severity Assessor', () => {
  it('should return a default severity of 2 if no description is provided', async () => {
    const severity = await analyzeSeverity('', 'Plumber');
    expect(severity).toEqual(2);
  });
});

