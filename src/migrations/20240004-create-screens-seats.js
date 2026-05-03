'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('screens', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      name: { type: Sequelize.STRING, allowNull: false, unique: true },
      totalSeats: { type: Sequelize.INTEGER, allowNull: false },
      rows: { type: Sequelize.INTEGER, allowNull: false },
      seatsPerRow: { type: Sequelize.INTEGER, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable('seats', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      screenId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'screens', key: 'id' },
        onDelete: 'CASCADE',
      },
      seatNumber: { type: Sequelize.STRING, allowNull: false },
      row: { type: Sequelize.STRING, allowNull: false },
      seatIndex: { type: Sequelize.INTEGER, allowNull: false },
      seatType: {
        type: Sequelize.ENUM('standard', 'premium', 'vip'),
        allowNull: false,
        defaultValue: 'standard',
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('seats', ['screenId']);
    await queryInterface.addIndex('seats', ['screenId', 'seatNumber'], { unique: true });
    await queryInterface.addIndex('seats', ['seatType']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('seats');
    await queryInterface.dropTable('screens');
  },
};
