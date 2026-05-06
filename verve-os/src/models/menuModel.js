export const createMenuItem = ({
  id,
  name,
  price,
  description = '',
  image = '',
  category = 'General',
  stock = 0,
}) => ({
  id,
  name,
  price,
  description,
  image,
  category,
  stock,
});
