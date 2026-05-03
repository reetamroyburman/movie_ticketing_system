'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('bookings', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      showtimeId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'showtimes', key: 'id' },
      },
      status: {
        type: Sequelize.ENUM('pending', 'confirmed', 'cancelled', 'expired'),
        defaultValue: 'pending',
        allowNull: false,
      },
      holdExpiresAt: { type: Sequelize.DATE },
      totalAmount: { type: Sequelize.DECIMAL(10, 2) },
      bookingReference: { type: Sequelize.STRING },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('bookings', ['userId', 'status']);
    await queryInterface.addIndex('bookings', ['showtimeId']);
    await queryInterface.addIndex('bookings', ['status']);

    await queryInterface.createTable('booked_seats', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      bookingId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'bookings', key: 'id' },
        onDelete: 'CASCADE',
      },
      seatInventoryId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'seat_inventory', key: 'id' },
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('booked_seats', ['bookingId', 'seatInventoryId'], { unique: true });

    await queryInterface.createTable('payments', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      bookingId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'bookings', key: 'id' },
        onDelete: 'CASCADE',
      },
      amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      status: {
        type: Sequelize.ENUM('pending', 'completed', 'refunded'),
        defaultValue: 'pending',
        allowNull: false,
      },
      paymentMethod: { type: Sequelize.STRING },
      cardLastFour: { type: Sequelize.STRING },
      transactionId: { type: Sequelize.STRING },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('payments', ['bookingId'], { unique: true });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('payments');
    await queryInterface.dropTable('booked_seats');
    await queryInterface.dropTable('bookings');
  },
};
