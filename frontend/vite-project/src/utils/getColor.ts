const getColor = (val: number) => {
    if (val < 50) return '#4caf50';
    if (val < 80) return '#ff9800';
    return '#f44336';
};

export default getColor;