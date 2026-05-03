'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('showtimes', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      movieId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'movies', key: 'id' },
      },
      screenId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'screens', key: 'id' },
      },
      startsAt: { type: Sequelize.DATE, allowNull: false },
      endsAt: { type: Sequelize.DATE, allowNull: false },
      basePrice: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('showtimes', ['movieId']);
    await queryInterface.addIndex('showtimes', ['screenId']);
    await queryInterface.addIndex('showtimes', ['startsAt']);

    await queryInterface.createTable('seat_inventory', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      showtimeId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'showtimes', key: 'id' },
        onDelete: 'CASCADE',
      },
      seatId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'seats', key: 'id' },
        onDelete: 'CASCADE',
      },
      status: {
        type: Sequelize.ENUM('available', 'held', 'booked'),
        defaultValue: 'available',
        allowNull: false,
      },
      heldUntil: { type: Sequelize.DATE },
      price: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    // Critical index for availability checks
    await queryInterface.addIndex('seat_inventory', ['showtimeId', 'status']);
    await queryInterface.addIndex('seat_inventory', ['showtimeId', 'seatId'], { unique: true });
    await queryInterface.addIndex('seat_inventory', ['status', 'heldUntil']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('seat_inventory');
    await queryInterface.dropTable('showtimes');
  },
};
